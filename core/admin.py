from django.contrib import admin
from .models import User, Hobby, UserHobby, Routine, UserRoutine, Task, UserSetting, UserStatus, RoutineFeedback, Notification, Friendship
from chat.models import Message

# Register models here
admin.site.register(User)
admin.site.register(Hobby)
admin.site.register(UserHobby)
admin.site.register(Routine)
admin.site.register(UserRoutine)
admin.site.register(Task)
admin.site.register(Message)
admin.site.register(UserSetting)
admin.site.register(UserStatus)
admin.site.register(RoutineFeedback)
admin.site.register(Notification)
admin.site.register(Friendship)