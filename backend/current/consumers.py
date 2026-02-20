import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = 'test_group'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        
        await self.send(text_data=json.dumps({
            'message': 'Websockets funcionando'
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get('message', '')
        
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'broadcast_message',
                'message': message
            }
        )

    async def broadcast_message(self, event):
        message = event['message']
        
        await self.send(text_data=json.dumps({
            'message': message
        }))