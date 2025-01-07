import json
from channels.generic.websocket import AsyncWebsocketConsumer
import logging

logger = logging.getLogger(__name__)

class RoverConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.rover_id = self.scope['url_route']['kwargs']['rover_id']
        self.room_group_name = f'rover_{self.rover_id}'

        logger.info(f"Tentando conectar WebSocket para rover {self.rover_id}")
        logger.info(f"Nome do grupo: {self.room_group_name}")

        # Juntar-se ao grupo
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        logger.info(f"WebSocket connection established for rover {self.rover_id}")
        await self.accept()
        logger.info(f"Conexão WebSocket aceita para rover {self.rover_id}")

    async def disconnect(self, close_code):
        logger.info(f"Desconectando WebSocket para rover {self.rover_id}")
        # Deixar o grupo
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"WebSocket disconnected for rover {self.rover_id} with code {close_code}")

    async def telemetry_update(self, event):
        """
        Handler para atualizações de telemetria.
        """
        try:
            logger.info(f"Recebido evento de telemetria para {self.rover_id}")
            logger.info(f"Dados do evento: {event}")

            data = event['data']
            logger.info(f"Dados formatados: {data}")

            # Garantir que os valores são números
            formatted_data = {
                'battery': float(data.get('battery', 0)),
                'temperature': float(data.get('temperature', 0)),
                'speed': float(data.get('speed', 0))
            }

            # Enviar dados para o WebSocket
            await self.send(text_data=json.dumps(formatted_data))
            logger.info(f"Dados enviados com sucesso para o cliente WebSocket: {formatted_data}")

        except Exception as e:
            logger.error(f"Error in telemetry_update: {str(e)}", exc_info=True)
            # Tentar enviar erro para o cliente
            try:
                await self.send(text_data=json.dumps({
                    'error': str(e),
                    'battery': 0,
                    'temperature': 0,
                    'speed': 0
                }))
            except:
                logger.error("Falha ao enviar mensagem de erro para o cliente")
