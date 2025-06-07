from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.models import RoutineActivityCompletion, User, Friendship, UserRoutine
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from django.db import models

# Serializer for the User model
from core.serializers import UserSerializer, FriendshipSerializer

class PublicUserDetailAPIView(APIView):
    """
    Fetch a user's public details by username
    """
    authentication_classes = []  # No auth
    permission_classes = []      # No permission checks

    def get(self, request, username, *args, **kwargs):
        user = get_object_or_404(User, username=username)
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UserDetailAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """
        Fetch the authenticated user's details
        """
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UsersView(APIView):
    authentication_classes = [JWTAuthentication]  # Enforce JWT authentication
    permission_classes = [IsAuthenticated]  # Require authentication

    def get(self, request):
        """Fetch all users except the current user and the admin (id == 1)."""
        try:
            users = User.objects.exclude(id__in=[request.user.id, 1])
            serializer = UserSerializer(users, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        
class SendFriendRequestView(APIView):
    authentication_classes = [JWTAuthentication]  # Enforce JWT authentication
    permission_classes = [IsAuthenticated]  # Require authentication

    def post(self, request, to_user_id):
        """Send a friend request"""
        from_user = request.user
        to_user = get_object_or_404(User, id=to_user_id)

        # Prevent self-friend requests
        if from_user == to_user:
            return Response({"error": "You cannot send a friend request to yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if a request already exists in either direction
        if Friendship.objects.filter(user=from_user, friend=to_user).exists():
            return Response({"error": "Friend request already sent."}, status=status.HTTP_400_BAD_REQUEST)

        if Friendship.objects.filter(user=to_user, friend=from_user).exists():
            return Response({"error": "You have already received a friend request from this user."}, status=status.HTTP_400_BAD_REQUEST)

        # Create the friend request
        friendship = Friendship.objects.create(user=from_user, friend=to_user, status="Pending")
        serializer = FriendshipSerializer(friendship)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class RespondToFriendRequestView(APIView):
    authentication_classes = [JWTAuthentication]  # Enforce JWT authentication
    permission_classes = [IsAuthenticated]  # Require authentication

    def post(self, request, request_id):
        """Accept or reject a friend request"""
        friendship = get_object_or_404(Friendship, id=request_id, friend=request.user)
        action = request.data.get("action")

        if action == "Accept":
            friendship.status = "Accepted"
            friendship.save()
            return Response({"message": "Friend request accepted."}, status=status.HTTP_200_OK)
        elif action == "Reject":
            # Delete the Friendship object if the request is rejected
            friendship.delete()
            return Response({"message": "Friend request rejected."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)


class ListFriendsView(APIView):
    authentication_classes = [JWTAuthentication]  # Enforce JWT authentication
    permission_classes = [IsAuthenticated]  # Require authentication

    def get(self, request):
        """List all friends of the authenticated user"""
        friends = Friendship.objects.filter(
            (models.Q(user=request.user) | models.Q(friend=request.user)),
            status="Accepted"
        )

        friend_list = [
            {
                "id": friend.friend.id if friend.user == request.user else friend.user.id,
                "username": friend.friend.username if friend.user == request.user else friend.user.username,
                "first_name": friend.friend.first_name if friend.user == request.user else friend.user.first_name,
                "last_name": friend.friend.last_name if friend.user == request.user else friend.user.last_name,
                "profile_picture": friend.friend.profile_picture if friend.user == request.user else friend.user.profile_picture
            }
            for friend in friends
        ]

        return Response(friend_list, status=status.HTTP_200_OK)
    
class RemoveFriendView(APIView):
    authentication_classes = [JWTAuthentication]  # Enforce JWT authentication
    permission_classes = [IsAuthenticated]  # Require authentication

    def delete(self, request, friend_id):
        """Remove a friend from the authenticated user's friend list"""
        user = request.user
        friendship = Friendship.objects.filter(
            (models.Q(user=user, friend_id=friend_id) | models.Q(user_id=friend_id, friend=user)),
            status="Accepted"
        ).first()

        if not friendship:
            return Response({"error": "Friendship not found."}, status=status.HTTP_404_NOT_FOUND)

        friendship.delete()
        return Response({"message": "Friend removed successfully."}, status=status.HTTP_200_OK)
    
class ViewFriendshipDetailsView(APIView):
    authentication_classes = [JWTAuthentication]  # Enforce JWT authentication
    permission_classes = [IsAuthenticated]  # Require authentication

    def get(self, request):
        """View friendship details of the logged-in user."""
        friendships = Friendship.objects.filter(models.Q(user=request.user) | models.Q(friend=request.user))
        serializer = FriendshipSerializer(friendships, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class ViewFriendRequestsView(APIView):
    authentication_classes = [JWTAuthentication]  # Enforce JWT authentication
    permission_classes = [IsAuthenticated]  # Require authentication

    def get(self, request):
        """List all pending friend requests received by the authenticated user."""
        friend_requests = Friendship.objects.filter(friend=request.user, status="Pending")
        serializer = FriendshipSerializer(friend_requests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class FriendRoutineView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, friend_id):
        """
        View a friend's routine
        Parameters:
        - friend_id: ID of the friend whose routine you want to view
        """
        try:
            # Verify friendship exists and is accepted
            friendship = Friendship.objects.filter(
                (models.Q(user=request.user, friend_id=friend_id) | 
                 models.Q(friend=request.user, user_id=friend_id)),
                status="Accepted"
            ).first()

            if not friendship:
                return Response(
                    {"error": "You are not friends with this user or friendship not accepted"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get the friend's user object
            friend = friendship.friend if friendship.user == request.user else friendship.user

            # Get the friend's primary routine
            user_routine = UserRoutine.objects.select_related('routine').filter(
                user=friend, 
                is_primary=True
            ).first()

            if not user_routine or not user_routine.routine:
                return Response(
                    {"error": "Friend has no primary routine"},
                    status=status.HTTP_404_NOT_FOUND
                )

            routine_data = user_routine.routine.routine_data.copy()

            # Fetch all completion records for this friend's routine
            completions = RoutineActivityCompletion.objects.filter(
                user=friend,
                routine=user_routine.routine
            ).values('day', 'activity_name', 'is_completed')

            # Convert to a lookup dictionary: {(day, activity_name) -> is_completed}
            completion_status = {
                (comp['day'], comp['activity_name']): comp['is_completed']
                for comp in completions
            }

            # Add is_completed to each activity in the routine
            for day, activities in routine_data.items():
                for activity in activities:
                    key = (day, activity['activity'])
                    activity['is_completed'] = completion_status.get(key, False)

            return Response({
                "friend_id": friend.id,
                "friend_username": friend.username,
                "friend_name": f"{friend.first_name} {friend.last_name}",
                "profile_picture": friend.profile_picture.url if friend.profile_picture else None,
                "routine_data": routine_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)