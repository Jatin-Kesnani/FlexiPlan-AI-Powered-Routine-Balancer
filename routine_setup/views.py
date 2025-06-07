from collections import defaultdict
from datetime import date, datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import json
import google.generativeai as genai
from google.api_core import exceptions
from django.conf import settings
from core.models import Routine, RoutineActivityCompletion, Task, UserHobby, Hobby, UserRoutine, UserSetting
from django.contrib.auth import get_user_model
import re  # ✅ Import the regular expression module
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

User = get_user_model()

# Fetch the API KEY from django settings
GOOGLE_API_KEY = getattr(settings, 'GOOGLE_API_KEY', None)

if GOOGLE_API_KEY is None:
    raise Exception("Set GOOGLE_API_KEY in your env")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('models/gemini-2.0-flash')

# Days of the week for validation and parsing
daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def parse_routine_text(routine_text):
    routine_data = {}
    day_sections = re.split(r"\*\*([A-Za-z]+)\*\*\n", routine_text)[1:]  # Split by day headers

    for i in range(0, len(day_sections), 2):
        day_name = day_sections[i]
        activities_text = day_sections[i + 1].strip()
        activities_list = []

        if activities_text:  # Check if there are activities for the day
            activity_lines = activities_text.strip().split('\n* ')  # Split into lines
            for line in activity_lines:
                match = re.match(r"(\d{2}:\d{2}) - (\d{2}:\d{2}):\s*(.*?)\s*\((.*?)\)", line)
                if match:
                    start_time, end_time, activity_name, activity_type = match.groups()
                    activities_list.append({
                        "activity": activity_name.strip(),
                        "start_time": start_time.strip(),
                        "end_time": end_time.strip(),
                        "type": activity_type.strip().lower()
                    })
        routine_data[day_name] = activities_list

    return routine_data

class GenerateRoutineView(APIView):
    authentication_classes = [JWTAuthentication]  # Enforce JWT authentication
    permission_classes = [IsAuthenticated]  # Require authentication

    def post(self, request, user_id, *args, **kwargs):  # ✅ Take user_id as path parameter

        try:
            user = User.objects.get(pk=user_id)  # ✅ Fetch user based on user_id from URL
        except User.DoesNotExist:
            return Response({"error": f"User with ID {user_id} not found"}, status=status.HTTP_404_NOT_FOUND)

        # Fetch User Data Dynamically - Modified timedelta formatting
        user_tasks_queryset = Task.objects.filter(user=user).values(
            'task_name', 'description', 'time_required', 'days_associated',
            'is_fixed_time', 'fixed_time_slot', 'priority'
        )
        user_tasks = []
        for task_dict in user_tasks_queryset:
            task_data = dict(task_dict)  # Convert ValuesQuerySet dictionary to regular dictionary
            time_required_timedelta = task_data.get('time_required')
            if time_required_timedelta:
                # Format timedelta to HH:MM:SS string using str() - Compatible with older Django
                task_data['time_required'] = str(time_required_timedelta)  # ✅ Use str() for timedelta formatting
            fixed_time_slot_delta = task_data.get('fixed_time_slot')
            if fixed_time_slot_delta:
                task_data['fixed_time_slot'] = str(fixed_time_slot_delta)
            user_tasks.append(task_data)

        user_hobbies_queryset = UserHobby.objects.filter(user=user).select_related('hobby')
        user_hobbies = [{"name": user_hobby.hobby.name, "category": user_hobby.hobby.category} for user_hobby in
                         user_hobbies_queryset]

        # user_settings_queryset = UserSetting.objects.filter(user=user).values('day_start_time', 'day_end_time', 'off_day_toggle').first()
        # user_settings = user_settings_queryset if user_settings_queryset else {}
        user_settings = {
            "day_start_time": "07:00:00",  # Earlier start time
            "day_end_time": "21:00:00",  # Later end time
        }
        
        prompt = f"""
            Generate a detailed and strictly structured weekly routine in a human-readable TEXT format, based ONLY on the following user-provided tasks and hobbies. Do NOT add any activities that are not explicitly listed in the provided tasks and hobbies.

            **Understanding User Data:**

            You will be given two categories of data: User Tasks and User Hobbies, and User Settings.

            *   **User Tasks:** This is a list of tasks the user needs to schedule. Each task object will have the following fields:
                *   `task_name`: (String) The name of the task.
                *   `description`: (String, Optional) A brief description of the task.
                *   `time_required`: (String in "HH:MM:SS" format) The *duration* of time needed to complete this task. This is NOT a start or end time, but the total time to allocate for the task.
                *   `days_associated`: (List of Strings) The days of the week this task should be scheduled (e.g., ["Monday", "Wednesday", "Friday"]).
                *   `priority`: (String - "High", "Medium", "Low") The priority level of the task.
                *   `is_fixed_time`: (Boolean) Indicates if the task MUST be scheduled at a specific time.
                *   `fixed_time_slot`: (String in "HH:MM:SS" format, Optional, only relevant if `is_fixed_time` is true) The specific time of day when this task MUST start.

                **Important for Tasks:**
                *   For tasks where `is_fixed_time` is `true`, schedule them to start at the exact `fixed_time_slot` and allocate the `time_required` duration from that start time.
                *   For tasks where `is_fixed_time` is `false` (flexible tasks), integrate them into the schedule on their `days_associated`, ensuring no time conflicts with fixed-time tasks. Prioritize scheduling high-priority flexible tasks first.
                *   Ensure ALL tasks from the provided list are included in the weekly routine on their specified days.

            *   **User Hobbies:** This is a list of hobbies the user wants to include in their routine. Each hobby object will have:
                *   `name`: (String) The name of the hobby.
                *   `category`: (String) The category of the hobby (e.g., "Sports", "Music", "Learning").

                **Important for Hobbies:**
                *   Integrate ALL provided hobbies into the weekly routine across different days to ensure variety.
                *   Allocate a reasonable time slot for each hobby (you can decide on a default duration if not specified, e.g., 1 hour, but ensure it's clearly scheduled).
                *   Hobbies should be scheduled in time slots that do not conflict with fixed-time tasks.

            *   **User Settings:** This will include:
                *   `day_start_time`: (String in "HH:MM:SS" format) The time the user's day starts.
                *   `day_end_time`: (String in "HH:MM:SS" format) The time the user's day ends.

                **Important for Settings:**
                *   The daily routine MUST start no earlier than `day_start_time` and end no later than `day_end_time` for each day.
                *   Create a structured routine for EVERY day of the week, from Monday to Sunday.

            **Output Format:**

            Return the weekly routine as a human-readable TEXT, with each day clearly marked in **bold markdown** (e.g., **Monday**).  For each day, list the activities as markdown list items (*). Each activity line should follow this format:

            Start Time - End Time: Activity Name (Activity Type) 
            (e.g., * 07:00 - 08:00: Morning Yoga (Hobby)). 

            Do NOT return JSON. Return plain TEXT in the format described above.

            User Tasks: {json.dumps(user_tasks)}
            User Hobbies: {json.dumps(user_hobbies)}
            User Settings: {json.dumps(user_settings)}
        """

        # Call Gemini API using the SDK
        try:
            response = model.generate_content(prompt)
            if response.text:
                raw_response_text = response.text  # Capture raw response text

                # Manual Text-Based Parsing - Call parsing function
                try:
                    generated_routine = parse_routine_text(raw_response_text)  # Call manual parsing function
                except Exception as e:  # Catch any parsing errors
                    return Response(
                        {"error": "Failed to parse routine text manually", "raw_response": raw_response_text,
                         "details": str(e)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)  # Send raw_response for debugging
                
                try:
                    today = date.today()
                    end_date = today + timedelta(days=7)  # Routine for the next 7 days

                    # Delete only the existing primary routine (if any)
                    existing_primary = UserRoutine.objects.filter(user=user, is_primary=True).first()
                    if existing_primary:
                        existing_primary.routine.delete()  # Deletes the linked Routine
                        existing_primary.delete()         # Deletes only this UserRoutine

                    # Now create a new routine
                    routine = Routine.objects.create(
                        start_date=today,
                        end_date=end_date,
                        routine_data=generated_routine
                    )

                    UserRoutine.objects.create(
                        user=user,
                        routine=routine,
                        permission='Edit',
                        is_primary=True  # ✅ Set the new one as primary
                    )
                    return Response({"routine": generated_routine}, status=status.HTTP_201_CREATED)
                except Exception as db_error:  # Catch database errors
                    return Response(
                        {"error": "Failed to save routine to database", "details": str(db_error)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR) # ✅ Handle database save errors
                
            else:
                return Response({"error": "The model returned no text"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except exceptions.GoogleAPIError as e:
            return Response({"error": f"Gemini API Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, user_id, *args, **kwargs):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": f"User with ID {user_id} not found"}, status=status.HTTP_404_NOT_FOUND)

        today = date.today()
        today_str = today.strftime("%A")

        try:
            current_routine = Routine.objects.get(
                user_routines__user=user,
                start_date__lte=today,
                end_date__gte=today,
                user_routines__is_primary=True
            )
        except Routine.DoesNotExist:
            return Response({"error": "No active primary routine found."}, status=status.HTTP_404_NOT_FOUND)

        user_hobbies_queryset = UserHobby.objects.filter(user=user).select_related('hobby')
        user_hobbies = [{"name": user_hobby.hobby.name, "category": user_hobby.hobby.category} for user_hobby in user_hobbies_queryset]
        user_settings = {
            "day_start_time": "07:00:00",
            "day_end_time": "21:00:00",
        }

        prompt = f"""
        Today's date is {today.strftime('%Y-%m-%d')}. It is {today_str}.
            Generate a fun and relaxing routine filled with the user's hobbies: {json.dumps(user_hobbies)}
            and ample time for rest. The day should start no earlier than {user_settings['day_start_time']} and end no later than {user_settings['day_end_time']}.

            **Important Instructions:**
            - For each activity, the type must be either "hobby" or "task" only.
            - If the activity comes from the user's hobbies list, use type "hobby".
            - For all other activities (including rest, meals, etc.), use type "task".

            **Output Format:**

            Return the weekly routine as a human-readable TEXT, with each day clearly marked in **bold markdown** (e.g., **Monday**).  For each day, list the activities as markdown list items (*). Each activity line should follow this format:

            Start Time - End Time: Activity Name (Activity Type: hobby/task) 
            (e.g., * 07:00 - 08:00: Morning Yoga (hobby)). 

            Do NOT return JSON. Return plain TEXT in the format described above.

            User Hobbies: {json.dumps(user_hobbies)}
            User Settings: {json.dumps(user_settings)}
        """

        try:
            response = model.generate_content(prompt)
            if response.text:
                try:
                    off_day_routine = parse_routine_text(response.text)
                    if today_str in off_day_routine and off_day_routine[today_str]:
                        # Normalize activity types to only "hobby" or "task"
                        normalized_activities = []
                        for activity in off_day_routine[today_str]:
                            # Determine if activity is a hobby
                            is_hobby = any(
                                hobby['name'].lower() in activity['activity'].lower() 
                                for hobby in user_hobbies
                            )
                            
                            normalized_activity = {
                                "type": "hobby" if is_hobby else "task",
                                "activity": activity['activity'],
                                "end_time": activity['end_time'],
                                "start_time": activity['start_time'],
                                "is_completed": False
                            }
                            normalized_activities.append(normalized_activity)
                        
                        # Update routine with normalized activities
                        current_routine.routine_data[today_str] = normalized_activities
                        current_routine.save()
                        return Response({"routine_data": current_routine.routine_data}, status=status.HTTP_200_OK)
                    else:
                        return Response({"error": f"The model did not return a routine for {today_str} or returned an empty routine. Raw response:\n{response.text}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                except Exception as parsing_error:
                    return Response(
                        {"error": "Failed to parse routine text.", "details": str(parsing_error), "raw_response": response.text},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            else:
                return Response({"error": "The model returned no text"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except exceptions.GoogleAPIError as api_error:
            return Response({"error": f"Gemini API Error: {str(api_error)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as general_error:
            return Response({"error": str(general_error)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EnhancedRoutineAnalyticsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        try:
            # Get the primary routine data from UserRoutineView response structure
            user_routine = UserRoutine.objects.select_related('routine').filter(
                user=user, 
                is_primary=True
            ).first()

            if not user_routine or not user_routine.routine:
                return Response({"error": "No primary routine found"}, status=status.HTTP_404_NOT_FOUND)

            routine_data = user_routine.routine.routine_data.copy()

            # Fetch all completion records
            completions = RoutineActivityCompletion.objects.filter(
                user=user,
                routine=user_routine.routine
            ).values('day', 'activity_name', 'is_completed')

            # Convert to a lookup dictionary: {(day, activity_name) -> is_completed}
            completion_status = {
                (comp['day'], comp['activity_name']): comp['is_completed']
                for comp in completions
            }

            # 1. Completion Rate Analytics
            completion_analytics = {
                'daily_completion_rates': defaultdict(dict),
                'activity_completion_rates': defaultdict(dict),
                'overall_completion_rate': {
                    'completed': 0,
                    'total': 0,
                    'percentage': 0
                },
                'completion_by_activity_type': {
                    'task': {'completed': 0, 'total': 0, 'percentage': 0},
                    'hobby': {'completed': 0, 'total': 0, 'percentage': 0}
                }
            }

            # 2. Time Allocation Analytics
            time_analytics = {
                'time_by_day': defaultdict(float),
                'time_by_activity': defaultdict(float),
                'time_by_type': {
                    'task': 0.0,
                    'hobby': 0.0
                },
                'average_daily_time': 0.0
            }

            # 3. Activity Frequency Analytics
            activity_frequency = {
                'most_frequent_activities': [],
                'activities_by_day': defaultdict(list)
            }

            total_activities = 0
            total_completed = 0
            total_task_completed = 0
            total_task_count = 0
            total_hobby_completed = 0
            total_hobby_count = 0

            for day, activities in routine_data.items():
                day_completed = 0
                day_total = len(activities)
                daily_time = 0.0

                for activity in activities:
                    total_activities += 1
                    activity_name = activity['activity']
                    activity_type = activity['type']
                    
                    # Calculate duration
                    start_time = datetime.strptime(activity['start_time'], '%H:%M')
                    end_time = datetime.strptime(activity['end_time'], '%H:%M')
                    duration = float((end_time - start_time).total_seconds() / 3600)  # in hours
                    
                    # Time analytics
                    time_analytics['time_by_day'][day] += duration
                    time_analytics['time_by_activity'][activity_name] += duration
                    time_analytics['time_by_type'][activity_type] += duration
                    daily_time += duration
                    
                    # Activity frequency
                    activity_frequency['activities_by_day'][day].append({
                        'activity': activity_name,
                        'type': activity_type,
                        'duration': round(duration, 2)
                    })
                    
                    # Completion status
                    key = (day, activity_name)
                    is_completed = completion_status.get(key, False)
                    activity['is_completed'] = is_completed
                    
                    if is_completed:
                        total_completed += 1
                        day_completed += 1
                        
                        if activity_type == 'task':
                            total_task_completed += 1
                        else:
                            total_hobby_completed += 1
                    
                    if activity_type == 'task':
                        total_task_count += 1
                    else:
                        total_hobby_count += 1
                
                # Daily completion rate
                completion_analytics['daily_completion_rates'][day] = {
                    'completed': day_completed,
                    'total': day_total,
                    'percentage': round((day_completed / day_total * 100) if day_total > 0 else 0.0, 2)
                }
                
                # Add daily time to time analytics
                time_analytics['time_by_day'][day] = round(daily_time, 2)

            # Calculate overall completion rates
            if total_activities > 0:
                completion_analytics['overall_completion_rate'] = {
                    'completed': total_completed,
                    'total': total_activities,
                    'percentage': round((total_completed / total_activities) * 100, 2)
                }
                
                completion_analytics['completion_by_activity_type']['task'] = {
                    'completed': total_task_completed,
                    'total': total_task_count,
                    'percentage': round((total_task_completed / total_task_count * 100) if total_task_count > 0 else 0.0, 2)
                }
                
                completion_analytics['completion_by_activity_type']['hobby'] = {
                    'completed': total_hobby_completed,
                    'total': total_hobby_count,
                    'percentage': round((total_hobby_completed / total_hobby_count * 100) if total_hobby_count > 0 else 0.0, 2)
                }

            # Calculate activity completion rates
            activity_completion_counts = defaultdict(lambda: {'completed': 0, 'total': 0})
            for (day, activity_name), is_completed in completion_status.items():
                activity_completion_counts[activity_name]['total'] += 1
                if is_completed:
                    activity_completion_counts[activity_name]['completed'] += 1

            for activity, counts in activity_completion_counts.items():
                completion_analytics['activity_completion_rates'][activity] = {
                    'completed': counts['completed'],
                    'total': counts['total'],
                    'percentage': round((counts['completed'] / counts['total'] * 100) if counts['total'] > 0 else 0.0, 2)
                }

            # Calculate average daily time
            if time_analytics['time_by_day']:
                time_analytics['average_daily_time'] = round(
                    float(sum(time_analytics['time_by_day'].values())) / float(len(time_analytics['time_by_day'])), 
                    2
                )

            # Find most frequent activities (top 5 by time spent)
            time_analytics['time_by_activity'] = dict(sorted(
                time_analytics['time_by_activity'].items(), 
                key=lambda item: item[1], 
                reverse=True
            ))
            activity_frequency['most_frequent_activities'] = [
                {'activity': k, 'total_hours': round(float(v), 2)} 
                for k, v in list(time_analytics['time_by_activity'].items())[:5]
            ]

            # 4. Weekly Pattern Analysis
            weekly_patterns = {
                'most_busy_day': max(time_analytics['time_by_day'].items(), key=lambda x: x[1])[0] if time_analytics['time_by_day'] else None,
                'least_busy_day': min(time_analytics['time_by_day'].items(), key=lambda x: x[1])[0] if time_analytics['time_by_day'] else None,
                'day_with_most_activities': max(
                    [(day, len(activities)) for day, activities in routine_data.items()], 
                    key=lambda x: x[1]
                )[0] if routine_data else None,
                'day_with_least_activities': min(
                    [(day, len(activities)) for day, activities in routine_data.items()], 
                    key=lambda x: x[1]
                )[0] if routine_data else None,
            }

            # 5. Time Balance Analysis
            task_time = float(time_analytics['time_by_type']['task'])
            hobby_time = float(time_analytics['time_by_type']['hobby'])
            total_time = task_time + hobby_time

            time_balance = {
                'task_vs_hobby_ratio': {
                    'task': round(task_time, 2),
                    'hobby': round(hobby_time, 2),
                    'ratio': round(task_time / hobby_time, 2) if hobby_time > 0 else 0.0
                },
                'work_life_balance_score': round(
                    (hobby_time / total_time * 100) if total_time > 0 else 0.0, 
                    2
                )
            }

            # 6. Routine Consistency Score
            consistency_score = {
                'average_daily_completion': completion_analytics['overall_completion_rate']['percentage'],
                'most_consistent_day': max(
                    completion_analytics['daily_completion_rates'].items(), 
                    key=lambda x: x[1]['percentage']
                )[0] if completion_analytics['daily_completion_rates'] else None,
                'least_consistent_day': min(
                    completion_analytics['daily_completion_rates'].items(), 
                    key=lambda x: x[1]['percentage']
                )[0] if completion_analytics['daily_completion_rates'] else None,
            }

            # Prepare final response
            analytics = {
                'completion_analytics': completion_analytics,
                'time_analytics': time_analytics,
                'activity_frequency': activity_frequency,
                'weekly_patterns': weekly_patterns,
                'time_balance': time_balance,
                'consistency_score': consistency_score,
                'routine_period': {
                    'start_date': user_routine.routine.start_date,
                    'end_date': user_routine.routine.end_date
                }
            }

            return Response(analytics, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)