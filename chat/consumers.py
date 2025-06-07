import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from core.models import Friendship, Message, User
import models, datetime

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user == AnonymousUser():
            await self.close()
            return

        self.friend_id = self.scope['url_route']['kwargs']['friend_id']
        
        # Check if users are friends
        if not await self.are_friends(self.user.id, self.friend_id):
            await self.close()
            return

        self.room_name = f"chat_{min(self.user.id, int(self.friend_id))}_{max(self.user.id, int(self.friend_id))}"
        self.room_group_name = f"chat_{self.room_name}"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    @database_sync_to_async
    def are_friends(self, user1_id, user2_id):
        return Friendship.objects.filter(
            (models.Q(user_id=user1_id, friend_id=user2_id) | models.Q(user_id=user2_id, friend_id=user1_id)),
            status="Accepted"
        ).exists()

    @database_sync_to_async
    def create_message(self, sender, receiver, message):
        return Message.objects.create(
            sender=sender,
            receiver=receiver,
            message=message
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        # Save message to database
        receiver = await database_sync_to_async(User.objects.get)(id=self.friend_id)
        await self.create_message(self.user, receiver, message)

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender_id': self.user.id,
                'timestamp': str(datetime.now())
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        sender_id = event['sender_id']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'sender_id': sender_id,
            'timestamp': event['timestamp']
        }))