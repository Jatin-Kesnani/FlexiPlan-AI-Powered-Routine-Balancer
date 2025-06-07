from django.urls import path
from .views import EnhancedRoutineAnalyticsView, GenerateRoutineView

urlpatterns = [
    path('generate-routine/<int:user_id>/', GenerateRoutineView.as_view(), name='generate-routine'),
    path('routine/analytics/', EnhancedRoutineAnalyticsView.as_view(), name='routine-analytics'),
]
