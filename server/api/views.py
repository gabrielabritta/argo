from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from django.views import View
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.cache import cache
import redis
import requests
import json
from .models import Rover, Substation, RoverTelemetry
from .serializers import RoverSerializer, SubstationSerializer
from django.views.decorators.csrf import csrf_exempt
from django.db.utils import OperationalError
from django.conf import settings
from django.db import connections
from redis import Redis
import logging

logger = logging.getLogger(__name__)

redis_client = redis.Redis(host='redis', port=6379, db=1)

class RoverViewSet(viewsets.ModelViewSet):
    queryset = Rover.objects.all()
    serializer_class = RoverSerializer

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
    rover_id = request.GET.get('rover', 'Rover-Argo-N-0')
    substation_id = request.GET.get('substation')
    logger.info(f"Buscando dados para rover {rover_id} da substation {substation_id}")

    try:
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
        logger.info(f"Dados brutos do Redis: {data}")

        if data:
            try:
                telemetry = json.loads(data)
                logger.info(f"Dados decodificados do Redis: {telemetry}")
                response_data = {
                    'battery': float(telemetry.get('battery', 0)),
                    'temperature': float(telemetry.get('temperature', 0)),
                    'speed': float(telemetry.get('speed', 0))
                }
                logger.info(f"Enviando resposta: {response_data}")
                return Response(response_data)
            except json.JSONDecodeError as e:
                logger.error(f"Erro ao decodificar dados do Redis: {e}")

        # Se não encontrar no Redis, buscar do banco de dados
        try:
            logger.info("Buscando dados do banco de dados")
            rover = Rover.objects.get(identifier=rover_id)
            last_telemetry = RoverTelemetry.objects.filter(
                rover=rover
            ).latest('timestamp')

            response_data = {
                'battery': float(last_telemetry.battery_level),
                'temperature': float(last_telemetry.temperature),
                'speed': float(last_telemetry.speed or 0)
            }
            logger.info(f"Dados encontrados no banco: {response_data}")
            return Response(response_data)

        except (Rover.DoesNotExist, RoverTelemetry.DoesNotExist):
            logger.warning(f"Nenhum dado encontrado para o rover {rover_id}")
            return Response({
                'battery': 0,
                'temperature': 0,
                'speed': 0
            })

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
        image_url = "http://192.168.100.57:8080/imagem"
        pos_url = "http://192.168.100.57:8080/pos"

        try:
            # Fazendo a solicitação para coletar a imagem
            image_response = requests.get(image_url, stream=True)

            # Fazendo a solicitação para coletar os dados de identificação de objetos
            pos_response = requests.get(pos_url)

            if image_response.status_code == 200 and pos_response.status_code == 200:
                # Codificar a imagem em base64
                image_base64 = base64.b64encode(image_response.raw.read()).decode('utf-8')

                # Obtendo o JSON com as coordenadas e rótulos
                pos_data = pos_response.json()
                print(pos_data)

                # Retornar a imagem e os dados em um JSON
                return JsonResponse({
                    'image': image_base64,
                    'objects': pos_data
                })
            else:
                return JsonResponse({'error': f"Error retrieving data, status code: {image_response.status_code} or {pos_response.status_code}"}, status=500)

        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': f"Error connecting to the image or object source: {str(e)}"}, status=500)

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
