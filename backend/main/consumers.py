import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Event, ChatMessage, User

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
       
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        self.room_group_name = f'chat_evento_{self.event_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
       
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    
    async def receive(self, text_data):
        data = json.loads(text_data)
        mensaje_texto = data['message']
        user_id = data['user_id'] 

        
        mensaje_guardado = await self.guardar_mensaje(user_id, self.event_id, mensaje_texto)

       
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'mensaje_data': mensaje_guardado
            }
        )

    async def chat_message(self, event):
        mensaje_data = event['mensaje_data']
        await self.send(text_data=json.dumps(mensaje_data))

    
    @database_sync_to_async
    def guardar_mensaje(self, user_id, event_id, text):
        from .serializers import ChatMessageSerializer 
        
       
        user = User.objects.get(id=user_id)
        event = Event.objects.get(id=event_id)
    
        msg = ChatMessage.objects.create(sender=user, event=event, text=text)
        
        return ChatMessageSerializer(msg).data