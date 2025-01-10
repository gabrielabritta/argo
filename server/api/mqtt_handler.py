import paho.mqtt.client as mqtt
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
import redis
from django.conf import settings
import logging
from django.utils import timezone
from django.db import transaction, DatabaseError
from .models import Rover, RoverTelemetry, SensorReading

logger = logging.getLogger(__name__)

class MQTTHandler:
    def __init__(self):
        # Configuração do cliente MQTT
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

        # Configuração do Redis para Telemetria
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=1,
                decode_responses=True
            )
            logger.info("Conectado ao Redis para salvamento de telemetria")
        except redis.RedisError as e:
            logger.error(f"Erro ao conectar ao Redis: {e}")
            self.redis_client = None  # Continua sem Redis se houver erro

        # Configuração do Channel Layer para WebSockets
        self.channel_layer = get_channel_layer()

        logger.info("MQTT Handler inicializado")

    def connect(self):
        try:
            self.client.connect(settings.MQTT_HOST, settings.MQTT_PORT, 60)
            logger.info(f"Conectado ao broker MQTT em {settings.MQTT_HOST}:{settings.MQTT_PORT}")
            self.client.loop_start()
        except Exception as e:
            logger.error(f"Erro ao conectar ao MQTT: {e}")
            raise

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Conectado ao broker MQTT com sucesso")
            topics = [
                ("substations/+/rovers/+/telemetry", 1),  # QoS 1 para garantir entrega
                ("substations/+/rovers/+/image", 1),
                ("substations/+/rovers/+/boxes", 1), 
            ]
            client.subscribe(topics)
            logger.info(f"Inscrito nos tópicos: {topics}")
        else:
            logger.error(f"Falha na conexão ao broker MQTT com código: {rc}")

    def on_message(self, client, userdata, msg):
        try:
            logger.info(f"[MQTT] Mensagem recebida no tópico: {msg.topic}")
            logger.info(f"[MQTT] Payload: {msg.payload}")
            parts = msg.topic.split('/')
            if len(parts) < 5:
                logger.error(f"[MQTT] Formato de tópico inválido: {msg.topic}")
                return

            substation_id = parts[1]
            rover_id = parts[3]
            message_type = parts[4]

            logger.info(f"[MQTT] Processando mensagem tipo {message_type} para rover {rover_id}")

            # Processar comando de captura de imagem
            if message_type == 'commands':
                try:
                    command_data = json.loads(msg.payload.decode())
                    logger.info(f"[MQTT] Comando recebido: {command_data}")

                    if command_data.get('command') == 'capture_image':
                        logger.info(f"[MQTT] Iniciando captura de imagem para rover {rover_id}")
                except json.JSONDecodeError:
                    logger.error(f"[MQTT] Falha ao decodificar comando JSON")
            elif message_type == 'image':
                self.handle_image_message(substation_id, rover_id, msg.payload)
            elif message_type == 'boxes':
                self.handle_boxes_message(rover_id, msg.payload)
            elif message_type == 'telemetry':
                self.handle_telemetry_message(substation_id, rover_id, msg.payload)
            else:
                logger.warning(f"Tipo de mensagem desconhecido: {message_type}")

        except Exception as e:
            logger.error(f"[MQTT] Erro no handler on_message: {e}", exc_info=True)

    def handle_image_message(self, substation_id, rover_id, payload):
        """
        Processa mensagens de imagem e envia via WebSocket
        """
        try:
            # Converter bytes da imagem para base64
            import base64
            image_data = base64.b64encode(payload).decode('utf-8')

            logger.info(f"[handle_image_message] Recebida imagem de {rover_id}")

            # Salvar no Redis
            if self.redis_client:
                image_key = f'image:sub{substation_id}:rover{rover_id}'
                self.redis_client.setex(image_key, 300, image_data)

            # Enviar via WebSocket
            async_to_sync(self.channel_layer.group_send)(
                f'rover_{rover_id}',
                {
                    'type': 'image_update',
                    'data': {
                        'image': image_data,
                        'timestamp': timezone.now().isoformat()
                    }
                }
            )
            logger.info(f"[handle_image_message] Imagem enviada ao WebSocket do rover {rover_id}")
        except Exception as e:
            logger.error(f"[handle_image_message] Erro ao tratar mensagem de imagem: {e}")

    def handle_boxes_message(self, rover_id, payload):
        """
        Processa mensagens de boxes e envia via WebSocket
        """
        try:
            # Decodificar JSON das boxes
            boxes_data = json.loads(payload)

            # Enviar via WebSocket com timestamp
            async_to_sync(self.channel_layer.group_send)(
                f'rover_{rover_id}',
                {
                    'type': 'boxes_update',
                    'data': {
                        'objects': boxes_data,
                        'timestamp': timezone.now().isoformat()
                    }
                }
            )
            logger.info(f"Dados de boxes enviados para WebSocket do rover {rover_id}")
        except json.JSONDecodeError as e:
            logger.error(f"Erro ao decodificar JSON das boxes: {e}")
        except Exception as e:
            logger.error(f"Erro ao tratar mensagem de boxes: {e}")

    def handle_telemetry_message(self, substation_id, rover_id, payload):
        """
        Processa mensagens de telemetria, salva no Redis e PostgreSQL,
        e envia via WebSocket
        """
        try:
            # Decodificar e parsear JSON
            try:
                payload_str = payload.decode('utf-8')
                data = json.loads(payload_str)
                logger.debug(f"Payload de telemetria decodificado: {data}")
            except json.JSONDecodeError as e:
                logger.error(f"Payload de telemetria JSON inválido: {e}")
                return
            except UnicodeDecodeError as e:
                logger.error(f"Erro ao decodificar payload de telemetria: {e}")
                return

            # Adicionar timestamp se não existir
            if 'timestamp' not in data:
                data['timestamp'] = timezone.now().isoformat()

            # Salvar no Redis
            if self.redis_client:
                redis_key = f'telemetry:sub{substation_id}:rover{rover_id}'
                try:
                    self.redis_client.setex(redis_key, 300, json.dumps(data))
                    logger.info(f"Dados de telemetria salvos no Redis com a chave: {redis_key}")
                except redis.RedisError as e:
                    logger.error(f"Erro ao salvar no Redis: {e}")

            # Salvar no PostgreSQL
            db_save_success = self.save_telemetry_to_database(rover_id, data)
            if not db_save_success:
                logger.error(f"Falha ao salvar telemetria no banco de dados para o rover {rover_id}")
                return

            # Preparar dados para WebSocket
            ws_data = {
                'battery': float(data.get('battery', 0)),
                'temperature': float(data.get('temperature', 0)),
                'speed': float(data.get('speed', 0)),
                'latitude': float(data.get('location', {}).get('lat', 0)),
                'longitude': float(data.get('location', {}).get('lng', 0)),
                'status': data.get('status', 'unknown'),
                'timestamp': data.get('timestamp')
            }

            # Enviar via WebSocket
            try:
                async_to_sync(self.channel_layer.group_send)(
                    f'rover_{rover_id}',
                    {
                        'type': 'telemetry_update',
                        'data': ws_data
                    }
                )
                logger.info(f"Atualização de telemetria enviada para WebSocket do rover {rover_id}")
            except Exception as e:
                logger.error(f"Erro ao enviar atualização via WebSocket: {e}")

        except Exception as e:
            logger.error(f"Erro ao tratar mensagem de telemetria: {e}", exc_info=True)

    def save_telemetry_to_database(self, rover_id, data):
        """
        Salva dados de telemetria no PostgreSQL com melhor tratamento de erros
        e logging detalhado
        """
        try:
            with transaction.atomic():
                # Buscar o rover com bloqueio para atualização
                try:
                    rover = Rover.objects.select_for_update().get(identifier=rover_id)
                except Rover.DoesNotExist:
                    logger.error(f"Rover não encontrado: {rover_id}")
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
                        logger.warning(f"Valor de sensor inválido para {sensor_type}: {value}. Erro: {e}")

                if sensor_readings:
                    SensorReading.objects.bulk_create(sensor_readings)

                logger.info(f"Telemetria salva com sucesso para o rover {rover_id}. ID da Telemetria: {telemetry.id}")
                return True

        except DatabaseError as e:
            logger.error(f"Erro no banco de dados ao salvar telemetria para o rover {rover_id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Erro inesperado ao salvar telemetria para o rover {rover_id}: {e}")
            return False

    def notify_websocket_clients(self, rover_id, event_type, data):
        """
        Método genérico para notificar clientes WebSocket
        """
        try:
            async_to_sync(self.channel_layer.group_send)(
                f'rover_{rover_id}',
                {
                    'type': event_type,
                    'data': data
                }
            )
            logger.debug(f"Notificação '{event_type}' enviada para WebSocket do rover {rover_id}")
        except Exception as e:
            logger.error(f"Erro ao notificar clientes WebSocket: {e}")
