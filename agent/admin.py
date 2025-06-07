from django.contrib import admin
from .models import Conversation, Message, AgentState

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'updated_at', 'is_active')
    list_filter = ('is_active', 'created_at')
    search_fields = ('user__username', 'user__email')

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'content', 'is_user', 'created_at')
    list_filter = ('is_user', 'created_at')
    search_fields = ('content', 'conversation__user__username')

@admin.register(AgentState)
class AgentStateAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'current_intent', 'created_at', 'updated_at')
    search_fields = ('conversation__user__username', 'current_intent')
