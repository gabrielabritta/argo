import os
import json
import logging
from datetime import datetime
import paho.mqtt.client as mqtt
from django.conf import settings
from django.core.cache import cache
from django.db import connections
from django.db.utils import OperationalError
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from redis import Redis
import redis
import requests
from .models import Rover, Substation, RoverTelemetry
from .mapping_manager import MapManager
from .serializers import RoverSerializer, SubstationSerializer

logger = logging.getLogger(__name__)

redis_client = redis.Redis(host='redis', port=6379, db=1)

class RoverViewSet(viewsets.ModelViewSet):
    queryset = Rover.objects.all()
    serializer_class = RoverSerializer
    lookup_field = 'identifier'

    def get_queryset(self):
        queryset = Rover.objects.all()
        substation_id = self.request.query_params.get('substation', None)

        if substation_id:
            queryset = queryset.filter(substation__identifier=substation_id)

        return queryset.filter(is_active=True)

    def create(self, request, *args, **kwargs):
        """
        Cria um novo rover associado a uma subestação.
        Exemplo de payload:
        {
            "name": "Rover-Argo-N-0",
            "identifier": "ROVER001",
            "model": "ArgoModel-2024",
            "substation": "SUB001"  # Identifier da subestação
        }
        """
        # Pegar o identifier da subestação do request
        substation_identifier = request.data.get('substation')
        if not substation_identifier:
            return Response(
                {'error': 'Substation identifier is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Buscar a subestação pelo identifier
            substation = Substation.objects.get(identifier=substation_identifier)

            # Criar uma cópia dos dados do request
            rover_data = request.data.copy()
            # Substituir o identifier da subestação pelo ID do objeto
            rover_data['substation'] = substation.id

            # Criar o serializer com os dados modificados
            serializer = self.get_serializer(data=rover_data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)

            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )

        except Substation.DoesNotExist:
            return Response(
                {'error': 'Substation not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def assign_substation(self, request, pk=None):
        """
        Endpoint para reassociar um rover a uma nova subestação.
        POST /api/rovers/{rover_id}/assign_substation/
        Payload: {"substation": "SUB001"}
        """
        rover = self.get_object()
        substation_identifier = request.data.get('substation')

        if not substation_identifier:
            return Response(
                {'error': 'Substation identifier is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            substation = Substation.objects.get(identifier=substation_identifier)
            rover.substation = substation
            rover.save()

            serializer = self.get_serializer(rover)
            return Response(serializer.data)

        except Substation.DoesNotExist:
            return Response(
                {'error': 'Substation not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class SubstationViewSet(viewsets.ModelViewSet):
    queryset = Substation.objects.all()
    serializer_class = SubstationSerializer
    lookup_field = 'identifier'

def clean_rover_redis_data(rover):
    """Limpa dados do rover no Redis quando ele é deletado"""
    keys_pattern = f"*:rover{rover.identifier}:*"
    for key in redis_client.scan_iter(match=keys_pattern):
        redis_client.delete(key)

class GPSDataView(View):
    def get(self, request, *args, **kwargs):
        rover_id = request.GET.get('rover')
        substation_id = request.GET.get('substation')

        if not rover_id or not substation_id:
            return JsonResponse({'error': 'Rover and substation IDs are required'}, status=400)

        # Tentar pegar do Redis primeiro
        redis_key = f'telemetry:sub{substation_id}:rover{rover_id}'
        data = redis_client.get(redis_key)

        if data:
            telemetry = json.loads(data)
            return JsonResponse({
                'latitude': telemetry.get('location', {}).get('lat'),
                'longitude': telemetry.get('location', {}).get('lng'),
                'status': telemetry.get('status')
            })

        # Se não encontrar no Redis, buscar último registro do PostgreSQL
        try:
            rover = Rover.objects.get(identifier=rover_id)
            last_telemetry = RoverTelemetry.objects.filter(rover=rover).latest('timestamp')

            return JsonResponse({
                'latitude': last_telemetry.latitude,
                'longitude': last_telemetry.longitude,
                'status': last_telemetry.status
            })

        except (Rover.DoesNotExist, RoverTelemetry.DoesNotExist):
            return JsonResponse({'error': 'No data available'}, status=404)

@api_view(['GET'])
def get_sensor_data(request):
    """
    Endpoint para obter dados dos sensores do rover.
    """
    rover_id = request.GET.get('rover')
    if not rover_id:
        return Response({'error': 'Rover ID is required'}, status=400)

    try:
        # Primeiro, buscar o rover para obter a subestação
        rover = Rover.objects.select_related('substation').get(identifier=rover_id)
        substation_id = rover.substation.identifier

        logger.info(f"Buscando dados para rover {rover_id} da substation {substation_id}")

        # Conectar ao Redis
        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=1,
            decode_responses=True
        )

        # Tentar pegar do Redis primeiro
        redis_key = f'telemetry:sub{substation_id}:rover{rover_id}'
        logger.info(f"Buscando dados do Redis com chave: {redis_key}")

        data = redis_client.get(redis_key)
        if data:
            try:
                telemetry = json.loads(data)
                response_data = {
                    'battery': float(telemetry.get('battery', 0)),
                    'temperature': float(telemetry.get('temperature', 0)),
                    'speed': float(telemetry.get('speed', 0)),
                    'substation': substation_id
                }
                return Response(response_data)
            except json.JSONDecodeError as e:
                logger.error(f"Erro ao decodificar dados do Redis: {e}")

        # Se não encontrar no Redis, buscar do banco
        try:
            last_telemetry = RoverTelemetry.objects.filter(
                rover=rover
            ).latest('timestamp')

            response_data = {
                'battery': float(last_telemetry.battery_level),
                'temperature': float(last_telemetry.temperature),
                'speed': float(last_telemetry.speed or 0),
                'substation': substation_id
            }
            return Response(response_data)

        except RoverTelemetry.DoesNotExist:
            return Response({
                'battery': 0,
                'temperature': 0,
                'speed': 0,
                'substation': substation_id
            })

    except Rover.DoesNotExist:
        return Response({'error': 'Rover not found'}, status=404)
    except Exception as e:
        logger.error(f"Erro ao buscar dados dos sensores: {str(e)}", exc_info=True)
        return Response({
            'battery': 0,
            'temperature': 0,
            'speed': 0
        })

@api_view(['GET'])
def list_active_rovers(request):
    """Lista todos os rovers ativos com seus últimos dados"""
    substation_id = request.GET.get('substation')

    if not substation_id:
        return Response({'error': 'Substation ID is required'}, status=400)

    # Buscar rovers do PostgreSQL
    rovers = Rover.objects.filter(
        substation__identifier=substation_id,
        is_active=True
    )

    rovers_data = []
    for rover in rovers:
        # Tentar pegar dados do Redis
        redis_key = f'telemetry:sub{substation_id}:rover{rover.identifier}'
        data = redis_client.get(redis_key)

        if data:
            telemetry = json.loads(data)
            rovers_data.append({
                'id': rover.identifier,
                'name': rover.name,
                'battery': telemetry.get('battery', 0),
                'temperature': telemetry.get('temperature', 0),
                'status': telemetry.get('status', 'unknown'),
                'last_seen': 'now'  # Dados do Redis são sempre recentes
            })
        else:
            # Se não encontrar no Redis, buscar do PostgreSQL
            try:
                last_telemetry = RoverTelemetry.objects.filter(
                    rover=rover
                ).latest('timestamp')

                rovers_data.append({
                    'id': rover.identifier,
                    'name': rover.name,
                    'battery': last_telemetry.battery_level,
                    'temperature': last_telemetry.temperature,
                    'status': last_telemetry.status,
                    'last_seen': last_telemetry.timestamp.isoformat()
                })
            except RoverTelemetry.DoesNotExist:
                continue  # Pular rovers sem dados de telemetria

    return Response(rovers_data)
# api/views.py (adicione junto com as outras views)

class CameraFeedView(View):
    def get(self, request, *args, **kwargs):
        camera_url = "http://192.168.100.57:4747/video"

        try:
            response = requests.get(camera_url, stream=True)

            if response.status_code == 200:
                return StreamingHttpResponse(
                    response.raw,
                    content_type=response.headers.get('Content-Type', 'image/jpeg')
                )
            else:
                return HttpResponse(f"Error retrieving camera feed, status code: {response.status_code}", status=response.status_code)

        except requests.exceptions.RequestException as e:
            return HttpResponse(f"Error connecting to the camera: {e}", status=500)

@csrf_exempt
def direction_view(request):
    if request.method == 'POST':
        body = json.loads(request.body)
        direction = body.get('direction', 'unknown')

        try:
            # Publicar comando no tópico MQTT do rover
            rover_id = request.GET.get('rover', 'Rover-Argo-N-0')
            substation_id = request.GET.get('substation')

            mqtt_client = mqtt.Client()
            mqtt_client.connect(settings.MQTT_HOST, settings.MQTT_PORT, 60)

            command_topic = f"substations/{substation_id}/rovers/{rover_id}/commands"
            command_data = {
                "command": "move",
                "direction": direction,
                "timestamp": datetime.now().isoformat()
            }

            mqtt_client.publish(command_topic, json.dumps(command_data))
            mqtt_client.disconnect()

            print(f"Comando enviado: {direction} para {rover_id}")
            return JsonResponse({
                'status': 'success',
                'direction': direction,
                'rover': rover_id
            })

        except Exception as e:
            print(f"Erro ao enviar comando: {e}")
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)

    return JsonResponse({'status': 'failure'}, status=400)

@csrf_exempt
def select_mission_view(request):
   if request.method == 'POST':
       body = json.loads(request.body)
       mission = body.get('mission', 'unknown')

       try:
           # Pegar identificadores do rover e subestação
           rover_id = request.GET.get('rover', 'Rover-Argo-N-0')
           substation_id = request.GET.get('substation')

           # Conectar ao MQTT
           mqtt_client = mqtt.Client()
           mqtt_client.connect(settings.MQTT_HOST, settings.MQTT_PORT, 60)

           # Montar tópico e mensagem
           mission_topic = f"substations/{substation_id}/rovers/{rover_id}/mission"
           mission_data = {
               "command": "start_mission",
               "mission": mission,
               "timestamp": datetime.now().isoformat(),
               "status": "pending"  # pode ser usado pelo rover para atualizar o status da missão
           }

           # Publicar no MQTT
           mqtt_client.publish(mission_topic, json.dumps(mission_data))
           mqtt_client.disconnect()

           print(f"Missão selecionada: {mission} para rover {rover_id}")
           return JsonResponse({
               'status': 'success',
               'mission': mission,
               'rover': rover_id
           })

       except Exception as e:
           print(f"Erro ao enviar missão: {e}")
           return JsonResponse({
               'status': 'error',
               'message': str(e)
           }, status=500)

   return JsonResponse({'status': 'failure'}, status=400)

class ImageView(View):
    def get(self, request, *args, **kwargs):
        rover_id = request.GET.get('rover')
        substation_id = request.GET.get('substation')

        if not rover_id or not substation_id:
            return JsonResponse({'error': 'Rover and substation IDs are required'}, status=400)

        try:
            # Tentar pegar do Redis primeiro (cache temporário)
            redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=1,
                decode_responses=True
            )

            # Usar chaves separadas para imagem e boxes
            image_key = f'image:sub{substation_id}:rover{rover_id}'
            boxes_key = f'boxes:sub{substation_id}:rover{rover_id}'

            image_data = redis_client.get(image_key)
            boxes_data = redis_client.get(boxes_key)

            if image_data and boxes_data:
                return JsonResponse({
                    'image': image_data,
                    'objects': json.loads(boxes_data)
                })
            else:
                return JsonResponse({'error': 'No recent image data available'}, status=404)

        except Exception as e:
            return JsonResponse({'error': f"Error retrieving data: {str(e)}"}, status=500)

@csrf_exempt
def box_click_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        print(f"Box clicada: {data}")
        return JsonResponse({'status': 'success', 'box': data})
    return JsonResponse({'status': 'failure'}, status=400)

@api_view(['GET'])
def health_check(request):
    # Verificar conexão com o banco de dados
    try:
        db_conn = connections['default']
        db_conn.cursor()
        db_status = True
    except OperationalError:
        db_status = False

    # Verificar conexão com Redis
    try:
        redis_client = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            socket_connect_timeout=1
        )
        redis_status = redis_client.ping()
    except Exception:
        redis_status = False

    status = {
        'database': 'up' if db_status else 'down',
        'redis': 'up' if redis_status else 'down',
        'status': 'healthy' if (db_status and redis_status) else 'unhealthy'
    }

    return Response(status)

@api_view(['POST'])
def request_image_view(request):
    try:
        body = json.loads(request.body)
        rover_id = body.get('rover')
        substation_id = body.get('substation')

        if not rover_id or not substation_id:
            return Response(
                {"error": "Informe 'rover' e 'substation' no corpo da requisição"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Montar a mensagem de comando com zoom
        command_data = {
            "zoom": body.get('zoom', 1.0)
        }

        try:
            # Conectar ao broker MQTT
            mqtt_client = mqtt.Client()
            mqtt_client.connect(settings.MQTT_HOST, settings.MQTT_PORT, 60)

            # Publicar no tópico de comandos específico do rover
            command_topic = f"substations/{substation_id}/rovers/{rover_id}/commands"

            # Publicar com QoS 1 para garantir entrega
            result = mqtt_client.publish(command_topic, json.dumps(command_data), qos=1)
            mqtt_client.disconnect()

            # Verifica se a publicação foi bem sucedida
            if result.rc != mqtt.MQTT_ERR_SUCCESS:
                raise Exception(f"Falha ao publicar mensagem MQTT: {result.rc}")

            logger.info(f"[request_image_view] Comando de captura enviado para rover {rover_id} na substation {substation_id}")
            return Response({
                "status": "success",
                "message": "Comando de captura enviado com sucesso"
            })

        except Exception as e:
            logger.error(f"Erro ao publicar no MQTT: {e}", exc_info=True)
            return Response({
                "error": f"Erro ao enviar comando para o rover: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except json.JSONDecodeError:
        return Response({
            "error": "Corpo da requisição inválido"
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Erro ao processar requisição: {e}", exc_info=True)
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def process_mapping(request):
    """
    Endpoint para processar o mapeamento de um rover
    """
    try:
        rover_id = request.data.get('rover_id')
        substation_id = request.data.get('substation_id')

        if not rover_id or not substation_id:
            return JsonResponse(
                {'error': 'rover_id e substation_id são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Configurar pasta base para mapas
        base_folder = os.path.join(os.getenv('ROVER_MAPS_DIR', '/tmp/rover_maps'))

        # Processar o mapeamento
        success, result = MapManager.process_mapping(
            rover_id=rover_id,
            base_folder=base_folder
        )

        if success:
            # Construir URL do mapa
            map_filename = f"rover_{rover_id}_latest_map.png"
            map_path = os.path.join(base_folder, f"rover_{rover_id}", map_filename)

            # Verificar se o arquivo existe
            if os.path.exists(map_path):
                # Em produção, você deve servir isso através de um servidor web adequado
                map_url = f"/maps/{map_filename}"
                return JsonResponse({
                    'status': 'success',
                    'processing_time': result,
                    'image_url': map_url
                })
            else:
                return JsonResponse({
                    'error': 'Arquivo de mapa não encontrado após processamento'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            return JsonResponse({
                'error': f'Falha no processamento do mapa: {result}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"Erro ao processar mapeamento: {str(e)}", exc_info=True)
        return JsonResponse(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@csrf_exempt
def iniciar_missao(request):
    """
    Endpoint para iniciar uma missão com base nas coordenadas recebidas
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            x = data.get('x')
            y = data.get('y')

            # Aqui apenas logamos as coordenadas recebidas
            logger.info(f"Missão solicitada para as coordenadas: x={x}, y={y}")

            return JsonResponse({
                'status': 'success',
                'message': f'Missão iniciada nas coordenadas: x={x}, y={y}',
                'coordinates': {'x': x, 'y': y}
            })
        except Exception as e:
            logger.error(f"Erro ao processar solicitação de missão: {str(e)}")
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=400)

    return JsonResponse({
        'status': 'error',
        'message': 'Método não permitido'
    }, status=405)

@csrf_exempt
def obter_mapa(request):
    """
    Endpoint para obter informações sobre o mapa
    """
    return JsonResponse({
        'status': 'success',
        'map_info': {
            'name': 'mapaNovo.png',
            'width': 800,
            'height': 600
        }
    })

@api_view(['POST'])
def configurar_insta360(request):
    """
    Endpoint para configurar a câmera Insta360 de um rover

    Envia comandos de configuração via MQTT para o rover
    Tópico: /substations/{substation_id}/rovers/{rover_id}/insta/config

    Payload esperado:
    {
        "rover_id": "ROVER001",
        "substation_id": "SUB001", (opcional, será buscado se não for fornecido)
        "ssid": "nome_da_rede_wifi", (opcional)
        "password": "senha_wifi", (opcional, requerido se ssid for fornecido)
        "rtmp": "url_rtmp" (opcional)
    }
    """
    try:
        # Extrair parâmetros da requisição
        rover_id = request.data.get('rover_id')
        substation_id = request.data.get('substation_id')
        ssid = request.data.get('ssid')
        password = request.data.get('password')
        rtmp_url = request.data.get('rtmp')

        # Validar rover_id
        if not rover_id:
            return Response({'error': 'rover_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        # Validar que pelo menos um campo de configuração está presente
        if not any([ssid, password, rtmp_url]):
            return Response(
                {'error': 'Pelo menos um dos campos: ssid, password ou rtmp deve ser fornecido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar dependência entre ssid e password
        if (ssid and not password) or (password and not ssid):
            return Response(
                {'error': 'Se ssid for fornecido, password também deve ser fornecido e vice-versa'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Buscar o rover pelo ID
        try:
            rover = Rover.objects.get(identifier=rover_id)

            # Se substation_id não foi fornecido, usar o do rover
            if not substation_id:
                substation_id = rover.substation.identifier

        except Rover.DoesNotExist:
            return Response(
                {'error': f'Rover com ID {rover_id} não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Montar o payload para o MQTT
        payload = {}
        if ssid:
            payload['ssid'] = ssid
        if password:
            payload['password'] = password
        if rtmp_url:
            payload['rtmp'] = rtmp_url

        # Definir o tópico MQTT
        topic = f'substations/{substation_id}/rovers/{rover_id}/insta/config'

        # Enviar comando via MQTT
        try:
            mqtt_client = mqtt.Client()
            mqtt_client.connect(settings.MQTT_HOST, settings.MQTT_PORT, 60)
            mqtt_client.publish(topic, json.dumps(payload))
            mqtt_client.disconnect()

            return Response({
                'message': 'Configuração enviada com sucesso',
                'topic': topic,
                'payload': payload
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erro ao enviar configuração MQTT: {str(e)}")
            return Response(
                {'error': f'Erro ao enviar configuração: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        logger.error(f"Erro ao processar requisição de configuração Insta360: {str(e)}")
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def conectar_insta360(request):
    """
    Endpoint para conectar/desconectar a câmera Insta360

    Envia comando de conexão/desconexão via MQTT para o rover
    Tópico: /substations/{substation_id}/rovers/{rover_id}/insta/connect

    Payload esperado:
    {
        "rover_id": "ROVER001",
        "substation_id": "SUB001", (opcional, será buscado se não for fornecido)
        "connect": 0 ou 1 (0 para desconectar, 1 para conectar)
    }
    """
    try:
        # Extrair parâmetros da requisição
        rover_id = request.data.get('rover_id')
        substation_id = request.data.get('substation_id')
        connect = request.data.get('connect')

        # Validar parâmetros obrigatórios
        if not rover_id:
            return Response({'error': 'rover_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        if connect not in [0, 1]:
            return Response(
                {'error': 'connect deve ser 0 (desconectar) ou 1 (conectar)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Buscar o rover pelo ID
        try:
            rover = Rover.objects.get(identifier=rover_id)

            # Se substation_id não foi fornecido, usar o do rover
            if not substation_id:
                substation_id = rover.substation.identifier

        except Rover.DoesNotExist:
            return Response(
                {'error': f'Rover com ID {rover_id} não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Montar o payload para o MQTT
        payload = {
            'connect': connect
        }

        # Definir o tópico MQTT
        topic = f'substations/{substation_id}/rovers/{rover_id}/insta/connect'

        # Enviar comando via MQTT
        try:
            mqtt_client = mqtt.Client()
            mqtt_client.connect(settings.MQTT_HOST, settings.MQTT_PORT, 60)
            mqtt_client.publish(topic, json.dumps(payload))
            mqtt_client.disconnect()

            return Response({
                'message': 'Comando de conexão enviado com sucesso',
                'topic': topic,
                'payload': payload
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erro ao enviar comando de conexão MQTT: {str(e)}")
            return Response(
                {'error': f'Erro ao enviar comando de conexão: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        logger.error(f"Erro ao processar requisição de conexão Insta360: {str(e)}")
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def iniciar_live_insta360(request):
    """
    Endpoint para iniciar/parar live da Insta360

    Envia comando de live via MQTT para o rover
    Tópico: /substations/{substation_id}/rovers/{rover_id}/insta/live

    Payload esperado:
    {
        "rover_id": "ROVER001",
        "substation_id": "SUB001", (opcional, será buscado se não for fornecido)
        "live": 0 ou 1 (0 para parar, 1 para iniciar)
    }

    Respostas possíveis via WebSocket:
    - status: 1 (live iniciado com sucesso)
    - status: 0 (live parado com sucesso)
    - status: -1 (erro ao iniciar/parar live)
    """
    try:
        # Extrair parâmetros da requisição
        rover_id = request.data.get('rover_id')
        substation_id = request.data.get('substation_id')
        live = request.data.get('live')

        # Validar parâmetros obrigatórios
        if not rover_id:
            return Response({'error': 'rover_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        if live not in [0, 1]:
            return Response(
                {'error': 'live deve ser 0 (parar) ou 1 (iniciar)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Buscar o rover pelo ID
        try:
            rover = Rover.objects.get(identifier=rover_id)

            # Se substation_id não foi fornecido, usar o do rover
            if not substation_id:
                substation_id = rover.substation.identifier

        except Rover.DoesNotExist:
            return Response(
                {'error': f'Rover com ID {rover_id} não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Montar o payload para o MQTT
        payload = {
            'live': live
        }

        # Definir o tópico MQTT
        topic = f'substations/{substation_id}/rovers/{rover_id}/insta/live'

        # Enviar comando via MQTT
        try:
            mqtt_client = mqtt.Client()
            mqtt_client.connect(settings.MQTT_HOST, settings.MQTT_PORT, 60)
            mqtt_client.publish(topic, json.dumps(payload))
            mqtt_client.disconnect()

            return Response({
                'message': 'Comando de live enviado com sucesso',
                'topic': topic,
                'payload': payload
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erro ao enviar comando de live MQTT: {str(e)}")
            return Response(
                {'error': f'Erro ao enviar comando de live: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        logger.error(f"Erro ao processar requisição de live Insta360: {str(e)}")
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def insta_live(request, rover_id):
    """
    Endpoint para iniciar/parar live Insta360.
    """
    try:
        logger.info(f"[API] Recebida requisição insta_live para rover {rover_id}")

        # Garantir que o status seja um número inteiro
        data = request.data.copy()
        if 'status' in data:
            # Converter para inteiro se for string
            if isinstance(data['status'], str):
                try:
                    data['status'] = int(data['status'])
                    logger.info(f"[API] Status convertido para inteiro: {data['status']}")
                except (ValueError, TypeError):
                    logger.warning(f"[API] Não foi possível converter status para inteiro: {data['status']}")

        # Enviar mensagem para o MQTT
        mqtt_client = get_mqtt_client()
        mqtt_client.publish(f"rover/{rover_id}/insta/live", json.dumps(data))
        logger.info(f"[API] Mensagem enviada para o MQTT: {data}")

        return Response({"status": "success"})
    except Exception as e:
        logger.error(f"Error in insta_live: {e}", exc_info=True)
        return Response({"status": "error", "message": str(e)}, status=500)

@api_view(['POST'])
def insta_capture(request, rover_id):
    """
    Endpoint para capturar foto Insta360.
    """
    try:
        logger.info(f"[API] Recebida requisição insta_capture para rover {rover_id}")

        # Garantir que o status seja um número inteiro
        data = request.data.copy()
        if 'status' in data:
            # Converter para inteiro se for string
            if isinstance(data['status'], str):
                try:
                    data['status'] = int(data['status'])
                    logger.info(f"[API] Status convertido para inteiro: {data['status']}")
                except (ValueError, TypeError):
                    logger.warning(f"[API] Não foi possível converter status para inteiro: {data['status']}")

        # Enviar mensagem para o MQTT
        mqtt_client = get_mqtt_client()
        mqtt_client.publish(f"rover/{rover_id}/insta/capture", json.dumps(data))
        logger.info(f"[API] Mensagem enviada para o MQTT: {data}")

        return Response({"status": "success"})
    except Exception as e:
        logger.error(f"Error in insta_capture: {e}", exc_info=True)
        return Response({"status": "error", "message": str(e)}, status=500)
