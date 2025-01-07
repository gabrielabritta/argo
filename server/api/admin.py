# admin.py
from django.contrib import admin
from .models import Rover, Substation

@admin.register(Rover)
class RoverAdmin(admin.ModelAdmin):
    list_display = ['name', 'identifier', 'substation', 'is_active']
    list_filter = ['is_active', 'substation']
    search_fields = ['name', 'identifier']

@admin.register(Substation)
class SubstationAdmin(admin.ModelAdmin):
    list_display = ['name', 'identifier', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'identifier']
