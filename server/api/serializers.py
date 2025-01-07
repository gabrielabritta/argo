from rest_framework import serializers
from .models import Rover, Substation

class RoverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rover
        fields = '__all__'

class SubstationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Substation
        fields = '__all__'
