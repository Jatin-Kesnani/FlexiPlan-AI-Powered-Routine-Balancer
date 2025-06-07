from django.urls import path
from .views import ExploreHobbiesView, UserHobbiesView

urlpatterns = [
    # Explore Hobbies for all users
    path('hobbies/', ExploreHobbiesView.as_view(), name='explore_hobbies'),
    
    # User-specific APIs
    path('user/<int:user_id>/hobbies/', UserHobbiesView.as_view(), name='user_hobbies'),
    path('user/<int:user_id>/hobbies/delete/<int:hobby_id>/', UserHobbiesView.as_view(), name='delete_user_hobby'),
]