from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/rovers/<str:rover_id>/', consumers.RoverConsumer.as_asgi()),
]
