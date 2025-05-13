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
    process_mapping,
    iniciar_missao,
    obter_mapa,
    configurar_insta360,
    conectar_insta360,
    iniciar_live_insta360,
    insta_live,
    insta_capture
)
from .graph_routes import (
    get_graph_data,
    get_obstacles,
    get_sample_graph_data,
    get_sample_obstacles
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
    path('iniciar-missao/', iniciar_missao, name='iniciar_missao'),
    path('obter-mapa/', obter_mapa, name='obter_mapa'),
    path('configurar-insta360/', configurar_insta360, name='configurar_insta360'),
    path('conectar-insta360/', conectar_insta360, name='conectar_insta360'),
    path('iniciar-live-insta360/', iniciar_live_insta360, name='iniciar_live_insta360'),
    path('rover/<int:rover_id>/insta/live/', insta_live, name='insta_live'),
    path('rover/<int:rover_id>/insta/capture/', insta_capture, name='insta_capture'),
    # New graph visualization endpoints
    path('graph-data/', get_graph_data, name='graph-data'),
    path('obstacles/', get_obstacles, name='obstacles'),
    path('sample-graph-data/', get_sample_graph_data, name='sample-graph-data'),
    path('sample-obstacles/', get_sample_obstacles, name='sample-obstacles'),
]
