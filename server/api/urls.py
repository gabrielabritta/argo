# api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CameraFeedView,
    direction_view,
    get_sensor_data,
    select_mission_view,
    GPSDataView,
    ImageView,
    box_click_view,
    RoverViewSet,
    SubstationViewSet,
    list_active_rovers,
    health_check,
    request_image_view,
    process_mapping
)

router = DefaultRouter()
router.register(r'rovers', RoverViewSet)
router.register(r'substations', SubstationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('health/', health_check, name='health-check'),
    path('camera-feed/', CameraFeedView.as_view(), name='camera-feed'),
    path('box-click/', box_click_view, name='box-click'),
    path('imagem/', ImageView.as_view(), name='image_view'),
    path('direction/', direction_view, name='direction'),
    path('sensor-data/', get_sensor_data, name='sensor-data'),
    path('select-mission/', select_mission_view, name='select-mission'),
    path('gps-data/', GPSDataView.as_view(), name='gps-data'),
    path('active-rovers/', list_active_rovers, name='active-rovers'),
    path('request-image/', request_image_view, name='request-image'), 
    path('process-mapping/', process_mapping, name='process-mapping'),
]
