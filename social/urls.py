from django.urls import path
from .views import FriendRoutineView, UsersView, SendFriendRequestView, RespondToFriendRequestView, ListFriendsView, RemoveFriendView, ViewFriendshipDetailsView, ViewFriendRequestsView, UserDetailAPIView, PublicUserDetailAPIView

urlpatterns = [
    path('users/', UsersView.as_view(), name='get_all_users'),
    path('users/details/', UserDetailAPIView.as_view(), name='user-detail'),
    path('users/<str:username>/', PublicUserDetailAPIView.as_view(), name='public-user-detail'),
    path("friends/send/<int:to_user_id>/", SendFriendRequestView.as_view(), name="send-friend-request"),
    path("friends/respond/<int:request_id>/", RespondToFriendRequestView.as_view(), name="respond-friend-request"),
    path("friends/list/", ListFriendsView.as_view(), name="list-friends"),
    path('friends/remove/<int:friend_id>/', RemoveFriendView.as_view(), name='remove-friend'),
    path("friends/details/", ViewFriendshipDetailsView.as_view(), name="friendship-details"),
    path('friends/requests/', ViewFriendRequestsView.as_view(), name='view_friend_requests'),
    path('friends/<int:friend_id>/routine/', FriendRoutineView.as_view(), name='friend-routine'),
]