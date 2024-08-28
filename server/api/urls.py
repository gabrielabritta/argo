from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExampleModelViewSet, CameraFeedView, direction_view, get_sensor_data, select_mission_view

router = DefaultRouter()
router.register(r'example', ExampleModelViewSet)

urlpatterns = [
    path('camera-feed/', CameraFeedView.as_view(), name='camera-feed'),
    path('direction/', direction_view, name='direction'),
    path('sensor-data/', get_sensor_data, name='sensor-data'),
    path('select-mission/', select_mission_view, name='select-mission'),
]
