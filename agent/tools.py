from typing import Optional, Dict, Any, Type
from langchain.tools import BaseTool
from core.models import Task, Hobby, UserHobby
from django.contrib.auth import get_user_model
from pydantic import BaseModel, Field
from django.utils.dateparse import parse_duration, parse_time
User = get_user_model()

class TaskInput(BaseModel):
    user_id: int = Field(description="The ID of the user creating the task")
    task_data: Dict[str, Any] = Field(description="The task data containing name, description, time_required, etc.")

class HobbyInput(BaseModel):
    user_id: int = Field(description="The ID of the user adding the hobby")
    hobby_data: Dict[str, str] = Field(description="The hobby data containing name and category")

class UserIdInput(BaseModel):
    user_id: int = Field(description="The ID of the user")

class CreateTaskTool(BaseTool):
    name: str = "create_task"
    description: str = "Create a new task for the user"
    args_schema: Type[BaseModel] = TaskInput
    
    def _run(self, user_id: int, task_data: Dict[str, Any]) -> str:
        try:
            user = User.objects.get(pk=user_id)
            
            # Convert duration string to timedelta
            time_required = parse_duration(task_data['time_required'])
            if not time_required:
                raise ValueError("Invalid time_required format. Use HH:MM:SS")
                
            # Handle optional fixed_time_slot
            fixed_time_slot = None
            if task_data.get('fixed_time_slot'):
                fixed_time_slot = parse_time(task_data['fixed_time_slot'])
                if not fixed_time_slot:
                    raise ValueError("Invalid fixed_time_slot format. Use HH:MM:SS")

            Task.objects.create(
                user=user,
                task_name=task_data['task_name'],
                time_required=time_required,
                days_associated=task_data['days_associated'],
                priority=task_data['priority'],
                is_fixed_time=task_data['is_fixed_time'],
                fixed_time_slot=fixed_time_slot
            )
            return f"Task '{task_data['task_name']}' created successfully!"
        except Exception as e:
            return f"Error creating task: {str(e)}"

class CreateHobbyTool(BaseTool):
    name: str = "create_hobby"
    description: str = "Create a new hobby and add it to the user's profile"
    args_schema: Type[BaseModel] = HobbyInput
    
    def _run(self, user_id: int, hobby_data: Dict[str, str]) -> str:
        try:
            user = User.objects.get(pk=user_id)
            hobby, created = Hobby.objects.get_or_create(
                name=hobby_data['name'],
                category=hobby_data['category']
            )
            
            if not UserHobby.objects.filter(user=user, hobby=hobby).exists():
                UserHobby.objects.create(user=user, hobby=hobby)
                return f"Hobby '{hobby.name}' added to your profile!"
            else:
                return f"You already have '{hobby.name}' in your hobbies!"
        except Exception as e:
            return f"Error adding hobby: {str(e)}"

class GetUserTasksTool(BaseTool):
    name: str = "get_user_tasks"
    description: str = "Get all tasks for a specific user"
    args_schema: Type[BaseModel] = UserIdInput
    
    def _run(self, user_id: int) -> str:
        try:
            tasks = Task.objects.filter(user_id=user_id)
            if not tasks.exists():
                return "You don't have any tasks yet."
            return "\n".join([f"- {task.task_name} (Priority: {task.priority})" for task in tasks])
        except Exception as e:
            return f"Error fetching tasks: {str(e)}"

class GetUserHobbiesTool(BaseTool):
    name: str = "get_user_hobbies"
    description: str = "Get all hobbies for a specific user"
    args_schema: Type[BaseModel] = UserIdInput
    
    def _run(self, user_id: int) -> str:
        try:
            user_hobbies = UserHobby.objects.filter(user_id=user_id).select_related('hobby')
            if not user_hobbies.exists():
                return "You don't have any hobbies yet."
            return "\n".join([f"- {user_hobby.hobby.name} ({user_hobby.hobby.category})" for user_hobby in user_hobbies])
        except Exception as e:
            return f"Error fetching hobbies: {str(e)}" 