import re
from typing import List, Dict, Any
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
from .tools import CreateTaskTool, CreateHobbyTool, GetUserTasksTool, GetUserHobbiesTool
from .models import Conversation, Message, AgentState
from django.conf import settings
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, AIMessage
from langchain.chains import ConversationChain
from langchain.prompts import PromptTemplate
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils.dateparse import parse_duration, parse_time

class AgentService:
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.conversation = self._get_or_create_conversation()
        self.agent_state = self._get_or_create_agent_state()
        self.tools = [
            CreateTaskTool(),
            CreateHobbyTool(),
            GetUserTasksTool(),
            GetUserHobbiesTool()
        ]
        self.agent = self._create_agent()
        
        # Create a more specific prompt template
        self.prompt = PromptTemplate(
        input_variables=["history", "input"],
        template="""You are a friendly task and hobby management assistant. Your main functions are:
        1. Help users manage their tasks and hobbies
        2. Create new tasks by collecting required information
        3. Add new hobbies to users' profiles
        4. Show existing tasks and hobbies
        5. Answer questions about task and hobby management

        When creating tasks, collect: task_name, time_required (HH:MM:SS), days_associated (comma-separated days), 
        priority (High/Medium/Low), is_fixed_time (yes/no), and fixed_time_slot if needed.
        
        For hobbies: collect name and category.
        
        If the user's request isn't about tasks or hobbies, provide a helpful response and suggest task/hobby related actions.
        
        Current conversation state:
        {history}
        
        User: {input}
        Assistant:"""
    )
        
        self.memory = ConversationBufferMemory()
        self.conversation_chain = ConversationChain(
            llm=self.agent,
            memory=self.memory,
            prompt=self.prompt,
            verbose=True
        )
        
    def _get_or_create_conversation(self) -> Conversation:
        conversation, created = Conversation.objects.get_or_create(
            user_id=self.user_id,
            is_active=True
        )
        return conversation
        
    def _get_or_create_agent_state(self) -> AgentState:
        state, created = AgentState.objects.get_or_create(
            conversation=self.conversation
        )
        return state
        
    def _create_agent(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured in settings.py")
        
        return ChatGoogleGenerativeAI(
            model="models/gemini-1.5-pro-latest",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.7
        )
        
    def process_message(self, message: str) -> str:
        try:
            current_intent = self.agent_state.current_intent
            collected_data = self.agent_state.collected_data.copy()

            if current_intent:
                return self._handle_current_intent(message, current_intent, collected_data)
            return self._handle_new_intent(message)
        except Exception as e:
            self._reset_agent_state()
            return f"Oops! Something went wrong. Let's start over. Error: {str(e)}"

    def _handle_current_intent(self, message: str, intent: str, collected_data: Dict) -> str:
        required_fields = self._get_required_fields(intent, collected_data)
        missing_fields = [f for f in required_fields if f not in collected_data]

        if not missing_fields:
            return self._finalize_creation(intent, collected_data)

        field = missing_fields[0]
        parsed_value = self._parse_field(field, message)
        
        if parsed_value is None:
            return self._get_invalid_prompt(field)
        
        collected_data[field] = parsed_value
        self._update_agent_state(collected_data)

        next_missing = [f for f in required_fields if f not in collected_data]
        return self._get_next_prompt(next_missing, intent) if next_missing else self._finalize_creation(intent, collected_data)

    def _handle_new_intent(self, message: str) -> str:
        if self._is_task_creation_request(message):
            self._initialize_agent_state('create_task')
            return "Let's create a new task! What's the name of the task?"
        if self._is_hobby_creation_request(message):
            self._initialize_agent_state('create_hobby')
            return "Let's add a new hobby! What's the name of the hobby?"
        return self._handle_general_conversation(message)

    def _handle_general_conversation(self, message: str) -> str:
        try:
            # Check for task/hobby list requests
            if any(keyword in message.lower() for keyword in ['show tasks', 'list tasks', 'my tasks']):
                return self.tools[2]._run(self.user_id)  # GetUserTasksTool
            
            if any(keyword in message.lower() for keyword in ['show hobbies', 'list hobbies', 'my hobbies']):
                return self.tools[3]._run(self.user_id)  # GetUserHobbiesTool

            # Use conversation chain for general chat
            response = self.conversation_chain.predict(input=message)
            
            # Add default suggestions if the conversation is not productive
            if not any(keyword in response.lower() for keyword in ['task', 'hobby', 'schedule']):
                response += "\n\nI can help you with:\n" + \
                        "- Creating new tasks ('add task')\n" + \
                        "- Adding hobbies ('add hobby')\n" + \
                        "- Viewing your tasks ('show tasks')\n" + \
                        "- Viewing your hobbies ('show hobbies')"
            
            return response

        except Exception as e:
            return "I'm here to help with managing your tasks and hobbies. " + \
                "You can ask me to:\n" + \
                "- Create a new task\n" + \
                "- Add a hobby\n" + \
                "- Show your tasks\n" + \
                "- Show your hobbies"

    def _get_required_fields(self, intent: str, data: Dict) -> list:
        fields = {
            'create_task': ['task_name', 'time_required', 'days_associated', 
                           'priority', 'is_fixed_time'],
            'create_hobby': ['name', 'category']
        }.get(intent, [])
        
        if intent == 'create_task' and data.get('is_fixed_time'):
            fields.append('fixed_time_slot')
        return fields

    def _parse_field(self, field: str, value: str) -> Any:
        parsers = {
            'task_name': lambda v: v.strip(),
            'time_required': self._parse_duration,
            'days_associated': self._parse_days,
            'priority': self._parse_priority,
            'is_fixed_time': self._parse_boolean,
            'fixed_time_slot': self._parse_time,
            'name': lambda v: v.strip(),
            'category': lambda v: v.strip()
        }
        return parsers.get(field, lambda v: None)(value)

    def _parse_days(self, value: str):
        valid_days = {'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                     'Friday', 'Saturday', 'Sunday'}
        days = [day.strip() for day in re.split(r'[,\s]+', value)]
        return days if all(day in valid_days for day in days) else None

    def _parse_priority(self, value: str):
        return value.capitalize() if value.lower() in {'high', 'medium', 'low'} else None

    def _parse_boolean(self, value: str):
        return True if value.lower() in {'yes', 'y', 'true'} else \
               False if value.lower() in {'no', 'n', 'false'} else None

    def _parse_duration(self, value: str):
        try:
            # Validate but keep as string
            parsed = parse_duration(value)
            if not parsed:
                return None
            # Return in HH:MM:SS format
            total_seconds = int(parsed.total_seconds())
            return f"{total_seconds // 3600:02d}:{(total_seconds % 3600) // 60:02d}:{total_seconds % 60:02d}"
        except (ValueError, ValidationError):
            return None

    def _parse_time(self, value: str):
        try:
            # Validate but keep as string
            parsed = parse_time(value)
            return parsed.strftime("%H:%M:%S")
        except (ValueError, ValidationError):
            return None

    def _get_invalid_prompt(self, field: str) -> str:
        prompts = {
            'task_name': "Please enter a valid task name.",
            'time_required': "Please enter time in HH:MM:SS format.",
            'days_associated': "Please enter valid days (e.g., 'Monday, Wednesday').",
            'priority': "Priority must be High, Medium, or Low.",
            'is_fixed_time': "Please answer with 'yes' or 'no'.",
            'fixed_time_slot': "Please enter time in HH:MM:SS format.",
            'name': "Please enter a valid hobby name.",
            'category': "Please enter a valid category."
        }
        return prompts.get(field, "Invalid input. Please try again.")

    def _get_next_prompt(self, missing_fields: list, intent: str) -> str:
        prompts = {
            'create_task': {
                'time_required': "How much time is needed (HH:MM:SS)?",
                'days_associated': "Which days (comma-separated)?",
                'priority': "What priority (High/Medium/Low)?",
                'is_fixed_time': "Is this a fixed-time task (yes/no)?",
                'fixed_time_slot': "What time should this be scheduled (HH:MM:SS)?"
            },
            'create_hobby': {
                'category': "What category does this hobby belong to?"
            }
        }
        next_field = missing_fields[0]
        return prompts[intent].get(next_field, "Please provide the required information.")

    def _finalize_creation(self, intent: str, data: Dict) -> str:
        try:
            # Remove the temporal type conversions here
            if intent == 'create_task':
                result = self.tools[0]._run(self.user_id, data)
            elif intent == 'create_hobby':
                result = self.tools[1]._run(self.user_id, data)
            else:
                return "Invalid request."
                
            self._reset_agent_state()
            return result
        except (IntegrityError, ValidationError) as e:
            self._reset_agent_state()
            return f"Error saving to database: {str(e)}"
        except Exception as e:
            self._reset_agent_state()
            return f"Unexpected error: {str(e)}"

    def _initialize_agent_state(self, intent: str):
        self.agent_state.current_intent = intent
        self.agent_state.collected_data = {}
        self.agent_state.save()

    def _update_agent_state(self, data: Dict):
        self.agent_state.collected_data = data
        self.agent_state.save()

    def _reset_agent_state(self):
        self.agent_state.current_intent = None
        self.agent_state.collected_data = {}
        self.agent_state.save()

    def _is_task_creation_request(self, message: str) -> bool:
    # ...existing code...
        creation_phrases = [
            'create task',
            'add task', 
            'new task',
            'make task'
        ]
        return any(phrase in message.lower() for phrase in creation_phrases)

    def _is_hobby_creation_request(self, message: str) -> bool:
        # ...existing code...
        creation_phrases = [
            'create hobby',
            'add hobby',
            'new hobby',
            'make hobby'
        ]
        return any(phrase in message.lower() for phrase in creation_phrases)