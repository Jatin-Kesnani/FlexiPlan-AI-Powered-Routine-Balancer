from django.urls import path
from .views import MessageListView, SendMessageView, MarkMessagesAsReadView

urlpatterns = [
    path('messages/<int:friend_id>/', MessageListView.as_view(), name='message-list'),
    path('messages/<int:friend_id>/send/', SendMessageView.as_view(), name='send-message'),
    path('messages/<int:friend_id>/mark-read/', MarkMessagesAsReadView.as_view(), name='mark-messages-read'),
]