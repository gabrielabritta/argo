# api/mqtt_handler.py
import paho.mqtt.client as mqtt
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
import redis
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class MQTTHandler:
    def __init__(self):
        # Configurar logging detalhado para MQTT
        logger.info("Inicializando MQTT Handler...")

        # Inicializar cliente MQTT
        self.client = mqtt.Client(client_id="django-server", clean_session=True)
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        self.client.on_subscribe = self.on_subscribe

        # Configurar Redis
        logger.info(f"Conectando ao Redis em {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=1,
            decode_responses=True
        )

        # Testar conexão com Redis
        try:
            self.redis_client.ping()
            logger.info("Conexão com Redis estabelecida com sucesso!")
        except redis.ConnectionError as e:
            logger.error(f"Erro ao conectar com Redis: {e}")

        self.channel_layer = get_channel_layer()
        logger.info("MQTT Handler inicializado")

    def connect(self):
        try:
            logger.info(f"Conectando ao broker MQTT em {settings.MQTT_HOST}:{settings.MQTT_PORT}")
            self.client.connect(settings.MQTT_HOST, settings.MQTT_PORT, 60)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"Erro ao conectar ao MQTT broker: {e}", exc_info=True)
            raise

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Conectado ao broker MQTT com sucesso")
            topics = [
                ("substations/+/rovers/+/telemetry", 0),
                ("substations/+/rovers/+/sensors/#", 0)
            ]
            client.subscribe(topics)
            logger.info(f"Inscrito nos tópicos: {topics}")
        else:
            logger.error(f"Falha ao conectar ao broker MQTT, código de retorno: {rc}")

    def on_subscribe(self, client, userdata, mid, granted_qos):
        logger.info(f"Inscrito com sucesso. MID: {mid}, QoS: {granted_qos}")

    def save_to_database(self, rover_id, data):

        from .models import Rover, RoverTelemetry  # Import local para evitar import circular

        try:
            rover = Rover.objects.get(identifier=rover_id)
            telemetry = RoverTelemetry.objects.create(
                rover=rover,
                battery_level=data.get('battery', 0),
                temperature=data.get('temperature', 0),
                speed=data.get('speed', 0),
                latitude=data.get('location', {}).get('lat'),
                longitude=data.get('location', {}).get('lng'),
                status=data.get('status', 'unknown')
            )
            logger.info(f"Telemetria salva no banco de dados: {telemetry.id}")
            return True
        except Rover.DoesNotExist:
            logger.error(f"Rover não encontrado: {rover_id}")
            return False
        except Exception as e:
            logger.error(f"Erro ao salvar telemetria no banco: {e}")
            return False

    def on_message(self, client, userdata, msg):
        try:
            logger.info(f"Mensagem recebida no tópico: {msg.topic}")
            logger.info(f"Payload bruto: {msg.payload}")

            # Extrair IDs do tópico
            parts = msg.topic.split('/')
            if len(parts) >= 5:
                substation_id = parts[1]
                rover_id = parts[3]

                # Decodificar payload
                payload = msg.payload.decode('utf-8')
                data = json.loads(payload)

                # Chave do Redis
                redis_key = f'telemetry:sub{substation_id}:rover{rover_id}'
                logger.info(f"Salvando no Redis com chave: {redis_key}")
                logger.info(f"Dados a serem salvos: {data}")
                # Salvar no Redis
                try:
                    saved = self.redis_client.setex(redis_key, 300, json.dumps(data))
                    logger.info(f"Dados salvos no Redis: {saved}")
                    self.save_to_database(rover_id, data)
                    # Verificar se os dados foram salvos
                    saved_data = self.redis_client.get(redis_key)
                    logger.info(f"Dados verificados no Redis: {saved_data}")
                except redis.RedisError as e:
                    logger.error(f"Erro ao salvar no Redis: {e}")
                    raise

                # Preparar dados para WebSocket
                ws_data = {
                    'battery': float(data.get('battery', 0)),
                    'temperature': float(data.get('temperature', 0)),
                    'speed': float(data.get('speed', 0))
                }

                # Enviar para WebSocket
                group_name = f'rover_{rover_id}'
                async_to_sync(self.channel_layer.group_send)(
                    group_name,
                    {
                        'type': 'telemetry_update',
                        'data': ws_data
                    }
                )
                logger.info(f"Dados enviados para o grupo WebSocket: {group_name}")

        except json.JSONDecodeError as e:
            logger.error(f"Erro ao decodificar JSON: {e}")
        except Exception as e:
            logger.error(f"Erro ao processar mensagem: {e}", exc_info=True)

    def on_disconnect(self, client, userdata, rc):
        if rc != 0:
            logger.warning(f"Desconexão inesperada do MQTT. Código: {rc}")
        else:
            logger.info("Desconectado do MQTT normalmente")
