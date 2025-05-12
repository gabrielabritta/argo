# api/management/commands/setup_initial_data.py

from django.core.management.base import BaseCommand
from api.models import Rover, Substation

class Command(BaseCommand):
    help = "Setup initial data for the rover application"

    def handle(self, *args, **kwargs):
        # Criar Substation inicial (apenas Parnaíba)
        substation, created = Substation.objects.get_or_create(
            identifier="SUB001",
            defaults={
                "name": "Subestação Parnaíba",
                "latitude": -3.1230245597847435,  # Parnaíba
                "longitude": -41.76592329781182,  # Parnaíba
                "is_active": True
            }
        )

        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Found'} substation: {substation.name}")
        )

        # Criar apenas o Rover Alpha para a subestação
        rover_data = {
            "identifier": "Rover-Alpha",
            "name": "Rover Alpha",
            "model": "Argo-N",
            "is_active": True
        }

        rover, created = Rover.objects.get_or_create(
            identifier=rover_data["identifier"],
            defaults={
                **rover_data,
                "substation": substation
            }
        )
        
        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Found'} rover: {rover.name}")
        )
