from rest_framework import serializers
from .models import Rover, Substation

class RoverSerializer(serializers.ModelSerializer):
    # Adicionar campo para exibir o identifier da subestação
    substation_identifier = serializers.CharField(source='substation.identifier', read_only=True)

    class Meta:
        model = Rover
        fields = ['id', 'name', 'identifier', 'model', 'is_active', 'substation', 'substation_identifier', 'battery_level', 'sensors', 'alerts']

    def to_representation(self, instance):
        """
        Customiza a representação do rover para incluir mais detalhes da subestação
        """
        representation = super().to_representation(instance)
        representation['substation_name'] = instance.substation.name
        return representation
    
class SubstationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Substation
        fields = ['id', 'name', 'identifier', 'latitude', 'longitude', 'is_active', 'description', 'voltage', 'created_at']
