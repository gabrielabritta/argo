import paho.mqtt.client as mqtt
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
import redis
from django.conf import settings
import logging
from datetime import datetime
from django.utils import timezone
from django.db import transaction, DatabaseError
from .models import Rover, RoverTelemetry, SensorReading

logger = logging.getLogger(__name__)

class MQTTHandler:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=1,
            decode_responses=True
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
        Salva dados de telemetria no PostgreSQL com melhor tratamento de erros
        e logging detalhado
        """
        try:
            with transaction.atomic():
                # Buscar o rover
                try:
                    rover = Rover.objects.select_for_update().get(identifier=rover_id)
                except Rover.DoesNotExist:
                    logger.error(f"Rover not found: {rover_id}")
                    return False

                # Criar registro de telemetria com valores padrão para campos nulos
                telemetry = RoverTelemetry.objects.create(
                    rover=rover,
                    battery_level=float(data.get('battery', 0)),
                    temperature=float(data.get('temperature', 0)),
                    speed=float(data.get('speed', 0)),
                    latitude=float(data.get('location', {}).get('lat', 0)),
                    longitude=float(data.get('location', {}).get('lng', 0)),
                    status=data.get('status', 'unknown')
                )

                # Criar registros individuais para cada sensor com validação
                sensors_data = [
                    ('battery', data.get('battery', 0), '%'),
                    ('temperature', data.get('temperature', 0), '°C'),
                    ('speed', data.get('speed', 0), 'km/h')
                ]

                sensor_readings = []
                for sensor_type, value, unit in sensors_data:
                    try:
                        value = float(value)
                        sensor_readings.append(
                            SensorReading(
                                rover=rover,
                                sensor_type=sensor_type,
                                value=value,
                                unit=unit
                            )
                        )
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Invalid sensor value for {sensor_type}: {value}. Error: {e}")

                if sensor_readings:
                    SensorReading.objects.bulk_create(sensor_readings)

                logger.info(f"Successfully saved telemetry data for rover {rover_id}. Telemetry ID: {telemetry.id}")
                return True

        except DatabaseError as e:
            logger.error(f"Database error saving telemetry for rover {rover_id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error saving telemetry for rover {rover_id}: {e}")
            return False

    def on_message(self, client, userdata, msg):
        try:
            logger.info(f"Message received on topic: {msg.topic}")

            # Extrair IDs do tópico
            parts = msg.topic.split('/')
            if len(parts) < 5:
                logger.error(f"Invalid topic format: {msg.topic}")
                return

            substation_id = parts[1]
            rover_id = parts[3]

            # Decodificar payload
            try:
                payload = msg.payload.decode('utf-8')
                data = json.loads(payload)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON payload: {e}")
                return
            except Exception as e:
                logger.error(f"Error decoding message payload: {e}")
                return

            # Adicionar timestamp se não existir
            if 'timestamp' not in data:
                data['timestamp'] = timezone.now().isoformat()

            # Salvar no Redis com tratamento de erro específico
            redis_key = f'telemetry:sub{substation_id}:rover{rover_id}'
            try:
                self.redis_client.setex(redis_key, 300, json.dumps(data))
                logger.info(f"Data saved to Redis for key: {redis_key}")
            except redis.RedisError as e:
                logger.error(f"Redis error: {e}")

            # Salvar no PostgreSQL
            db_save_success = self.save_telemetry_to_database(rover_id, data)
            if not db_save_success:
                logger.error(f"Failed to save telemetry to database for rover {rover_id}")

            # Preparar e enviar dados para WebSocket apenas se salvou no banco
            if db_save_success:
                try:
                    ws_data = {
                        'battery': float(data.get('battery', 0)),
                        'temperature': float(data.get('temperature', 0)),
                        'speed': float(data.get('speed', 0)),
                        'timestamp': data.get('timestamp')
                    }

                    async_to_sync(self.channel_layer.group_send)(
                        f'rover_{rover_id}',
                        {
                            'type': 'telemetry_update',
                            'data': ws_data
                        }
                    )
                except Exception as e:
                    logger.error(f"Error sending WebSocket update: {e}")

        except Exception as e:
            logger.error(f"Error in on_message handler: {e}", exc_info=True)

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to MQTT broker")
            topics = [
                ("substations/+/rovers/+/telemetry", 0),
                ("substations/+/rovers/+/sensors/#", 0)
            ]
            client.subscribe(topics)
            logger.info(f"Subscribed to topics: {topics}")
        else:
            logger.error(f"Failed to connect to MQTT broker with code: {rc}")
