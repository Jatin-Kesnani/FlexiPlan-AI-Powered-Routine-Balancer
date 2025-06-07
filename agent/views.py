from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from .services import AgentService
from .models import Conversation, Message
from rest_framework import serializers

# Create your views here.

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['content', 'is_user', 'created_at']

class ChatView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        print("=== ChatView POST Request ===")
        print("Request headers:", request.headers)
        print("Request data:", request.data)
        print("User:", request.user)
        
        user_message = request.data.get('message')
        if not user_message:
            print("Error: No message provided")
            return Response(
                {"error": "Message is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            print("Creating AgentService for user:", request.user.id)
            agent_service = AgentService(request.user.id)
            print("Processing message with agent service")
            response = agent_service.process_message(user_message)
            print("Agent response:", response)
            return Response({"response": response})
        except Exception as e:
            print("Error in ChatView:", str(e))
            import traceback
            print("Traceback:", traceback.format_exc())
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def get(self, request):
        print("=== ChatView GET Request ===")
        print("Request headers:", request.headers)
        print("User:", request.user)
        
        try:
            conversation = Conversation.objects.filter(
                user=request.user,
                is_active=True
            ).first()
            
            if not conversation:
                print("No active conversation found for user")
                return Response({"messages": []})
                
            messages = Message.objects.filter(
                conversation=conversation
            ).order_by('created_at')
            
            serializer = MessageSerializer(messages, many=True)
            return Response({"messages": serializer.data})
        except Exception as e:
            print("Error in ChatView GET:", str(e))
            import traceback
            print("Traceback:", traceback.format_exc())
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
