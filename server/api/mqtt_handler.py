import paho.mqtt.client as mqtt
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
import redis
from django.conf import settings
import logging
from datetime import datetime
from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)

class MQTTHandler:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=1
        )
        self.channel_layer = get_channel_layer()
        logger.info("MQTT Handler initialized")

    def connect(self):
        try:
            self.client.connect(settings.MQTT_HOST, settings.MQTT_PORT, 60)
            logger.info(f"Connected to MQTT broker at {settings.MQTT_HOST}:{settings.MQTT_PORT}")
            self.client.loop_start()
        except Exception as e:
            logger.error(f"Error connecting to MQTT: {e}")
            raise

    def save_telemetry_to_database(self, rover_id, data):
        """
        Salva dados de telemetria no PostgreSQL
        """
        from .models import Rover, RoverTelemetry, SensorReading  # Import local para evitar import circular

        try:
            with transaction.atomic():
                # Buscar o rover
                rover = Rover.objects.get(identifier=rover_id)

                # Criar registro de telemetria
                telemetry = RoverTelemetry.objects.create(
                    rover=rover,
                    battery_level=float(data.get('battery', 0)),
                    temperature=float(data.get('temperature', 0)),
                    speed=float(data.get('speed', 0)),
                    latitude=float(data.get('location', {}).get('lat', 0)),
                    longitude=float(data.get('location', {}).get('lng', 0)),
                    status=data.get('status', 'unknown')
                )

                # Criar registros individuais para cada sensor
                sensors_data = [
                    ('battery', data.get('battery', 0), '%'),
                    ('temperature', data.get('temperature', 0), '°C'),
                    ('speed', data.get('speed', 0), 'km/h')
                ]

                for sensor_type, value, unit in sensors_data:
                    SensorReading.objects.create(
                        rover=rover,
                        sensor_type=sensor_type,
                        value=float(value),
                        unit=unit
                    )

                logger.info(f"Saved telemetry data for rover {rover_id}: {telemetry.id}")
                return True

        except Rover.DoesNotExist:
            logger.error(f"Rover not found: {rover_id}")
            return False
        except Exception as e:
            logger.error(f"Error saving telemetry to database: {e}")
            return False

    def on_message(self, client, userdata, msg):
        try:
            logger.info(f"Message received on topic: {msg.topic}")

            # Extrair IDs do tópico
            parts = msg.topic.split('/')
            if len(parts) >= 5:  # Verifica se o tópico tem o formato esperado
                substation_id = parts[1]
                rover_id = parts[3]

                # Decodificar payload
                payload = msg.payload.decode('utf-8')
                data = json.loads(payload)

                # Adicionar timestamp se não existir
                if 'timestamp' not in data:
                    data['timestamp'] = timezone.now().isoformat()

                # Salvar no Redis
                redis_key = f'telemetry:sub{substation_id}:rover{rover_id}'
                try:
                    self.redis_client.setex(redis_key, 300, json.dumps(data))
                    logger.info(f"Data saved to Redis for key: {redis_key}")
                except redis.RedisError as e:
                    logger.error(f"Redis error: {e}")

                # Salvar no PostgreSQL
                self.save_telemetry_to_database(rover_id, data)

                # Preparar dados para WebSocket
                ws_data = {
                    'battery': float(data.get('battery', 0)),
                    'temperature': float(data.get('temperature', 0)),
                    'speed': float(data.get('speed', 0)),
                    'timestamp': data.get('timestamp')
                }

                # Enviar para WebSocket
                async_to_sync(self.channel_layer.group_send)(
                    f'rover_{rover_id}',
                    {
                        'type': 'telemetry_update',
                        'data': ws_data
                    }
                )

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to MQTT broker")
            # Inscrever em todos os tópicos relevantes
            topics = [
                ("substations/+/rovers/+/telemetry", 0),
                ("substations/+/rovers/+/sensors/#", 0)
            ]
            client.subscribe(topics)
            logger.info(f"Subscribed to topics: {topics}")
        else:
            logger.error(f"Failed to connect to MQTT broker with code: {rc}")
