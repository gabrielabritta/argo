from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views import View
from rest_framework import viewsets
from .models import ExampleModel
from .serializers import ExampleModelSerializer
import requests
import json
import base64

class GPSDataView(View):
    def get(self, request, *args, **kwargs):
        gps_url = "http://192.168.100.161:5000/gps/location_orientation"
        
        try:
            response = requests.get(gps_url)

            if response.status_code == 200:
                gps_data = response.json()
                return JsonResponse(gps_data)
            else:
                return JsonResponse({'status': 'failure', 'error': 'Failed to retrieve GPS data'}, status=response.status_code)

        except requests.exceptions.RequestException as e:
            return JsonResponse({'status': 'failure', 'error': str(e)}, status=500)

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

class ExampleModelViewSet(viewsets.ModelViewSet):
    queryset = ExampleModel.objects.all()
    serializer_class = ExampleModelSerializer

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


def get_sensor_data(request):
    rover = request.GET.get('rover', 'Rover-Argo-N-0')
    
    if rover == 'Rover-Argo-N-0':
        data = {
            'battery': 75,  # Exemplo de valor para Rover-Argo-N-0
            'temperature': 36.5,  # Exemplo de valor para Rover-Argo-N-0
            'speed': 15.2,  # Exemplo de valor para Rover-Argo-N-0
        }
    elif rover == 'Rover-Argo-N-1':
        data = {
            'battery': 65,  # Exemplo de valor para Rover-Argo-N-1
            'temperature': 34.0,  # Exemplo de valor para Rover-Argo-N-1
            'speed': 12.0,  # Exemplo de valor para Rover-Argo-N-1
        }
    else:
        data = {
            'battery': 0,
            'temperature': 0,
            'speed': 0,
        }
    
    return JsonResponse(data)

@csrf_exempt
def direction_view(request):
    if request.method == 'POST':
        body = json.loads(request.body)
        direction = body.get('direction', 'unknown')
        print(f"Tecla pressionada: {direction}")
        return JsonResponse({'status': 'success', 'direction': direction})
    return JsonResponse({'status': 'failure'}, status=400)

@csrf_exempt
def select_mission_view(request):
    if request.method == 'POST':
        body = json.loads(request.body)
        mission = body.get('mission', 'unknown')
        print(f"Missão selecionada: {mission}")
        return JsonResponse({'status': 'success', 'mission': mission})
    return JsonResponse({'status': 'failure'}, status=400)
