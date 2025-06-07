from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from core.models import User, Friendship
from .models import Message
from core.serializers import MessageSerializer
from django.db.models import Q
from datetime import datetime

class MessageListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, friend_id):
        """Get all messages between the authenticated user and the specified friend"""
        friend = get_object_or_404(User, id=friend_id)
        if not self.are_friends(request.user, friend):
            return Response({"error": "You are not friends with this user."}, status=status.HTTP_403_FORBIDDEN)

        messages = Message.objects.filter(
            (Q(sender=request.user, receiver=friend) | Q(sender=friend, receiver=request.user))
        ).order_by('timestamp')

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def are_friends(self, user1, user2):
        """Check if two users are friends"""
        return Friendship.objects.filter(
            (Q(user=user1, friend=user2) | Q(user=user2, friend=user1)),
            status="Accepted"
        ).exists()

class SendMessageView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, friend_id):
        """Send a direct message to a friend"""
        friend = get_object_or_404(User, id=friend_id)
        
        # Check if users are friends
        if not Friendship.objects.filter(
            (Q(user=request.user, friend=friend) | Q(user=friend, friend=request.user)),
            status="Accepted"
        ).exists():
            return Response({"error": "You are not friends with this user."}, status=status.HTTP_403_FORBIDDEN)

        message_text = request.data.get('message')
        if not message_text or not message_text.strip():
            return Response({"error": "Message cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        # Create and save the message
        message = Message.objects.create(
            sender=request.user,
            receiver=friend,
            message=message_text,
            timestamp=datetime.now()
        )

        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class MarkMessagesAsReadView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, friend_id):
        """Mark all unread messages from a friend as read"""
        friend = get_object_or_404(User, id=friend_id)
        updated = Message.objects.filter(
            receiver=request.user,
            sender=friend,
            is_read=False
        ).update(is_read=True)
        
        return Response({
            "status": "success",
            "messages_updated": updated
        }, status=status.HTTP_200_OK)