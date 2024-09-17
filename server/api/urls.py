from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExampleModelViewSet, CameraFeedView, direction_view, get_sensor_data, select_mission_view, GPSDataView, ImageView, box_click_view

router = DefaultRouter()
router.register(r'example', ExampleModelViewSet)

urlpatterns = [
    path('camera-feed/', CameraFeedView.as_view(), name='camera-feed'),
    path('box-click/', box_click_view, name='box-click'),
    path('imagem/', ImageView.as_view(), name='image_view'),
    path('direction/', direction_view, name='direction'),
    path('sensor-data/', get_sensor_data, name='sensor-data'),
    path('select-mission/', select_mission_view, name='select-mission'),
    path('gps-data/', GPSDataView.as_view(), name='gps-data'),  
]
