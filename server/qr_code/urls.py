from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='qr_code_index'),
    path('add/', views.add_rover, name='add_rover'),
    path('check-id/', views.check_rover_id, name='check_rover_id'),
    path('rover/<str:rover_id>/', views.rover_detail, name='rover_detail'),
]
