from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views import View
from rest_framework import viewsets
from .models import ExampleModel
from .serializers import ExampleModelSerializer
import requests
import json

class ExampleModelViewSet(viewsets.ModelViewSet):
    queryset = ExampleModel.objects.all()
    serializer_class = ExampleModelSerializer

class CameraFeedView(View):
    def get(self, request, *args, **kwargs):
        camera_url = "http://192.168.100.117:4747/video"

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
