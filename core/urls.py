from django.urls import path
from .views import (
    MarkActivityCompletedView, RefreshTokenView, RemoveActivityFromRoutineView,
    SignupView, LoginView, UserRoutineView, UserTaskDetailView, UserTasksView,
    UploadUserPfp, FriendsListView
)
urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh-token/', RefreshTokenView.as_view(), name='refresh-token'),
    path('users/<int:user_id>/tasks/', UserTasksView.as_view(), name='user-tasks'), 
    path('users/<int:user_id>/tasks/<int:task_id>/', UserTaskDetailView.as_view(), name='user-task-detail'),
    path('users/<int:user_id>/update-task/<int:task_id>/', UserTaskDetailView.as_view(), name='user-task-update'),
    path('user-routine/', UserRoutineView.as_view(), name='user-routines'),
    path('upload-pfp/', UploadUserPfp.as_view(), name='upload-profile-picture'),
    path('routine/mark-completed/', MarkActivityCompletedView.as_view(), name='mark-activity-completed'),
    path('routine/remove-activity/', RemoveActivityFromRoutineView.as_view(), name='remove-activity-from-routine'),
    path('friends/list/', FriendsListView.as_view(), name='friends-list'),
]