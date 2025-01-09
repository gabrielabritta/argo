# api/management/commands/setup_initial_data.py

from django.core.management.base import BaseCommand
from api.models import Rover, Substation

class Command(BaseCommand):
    help = "Setup initial data for the rover application"

    def handle(self, *args, **kwargs):
        # Criar Substation inicial
        substation, created = Substation.objects.get_or_create(
            identifier="SUB001",
            defaults={
                "name": "Subestação Principal",
                "location": "Local Principal",
                "is_active": True
            }
        )

        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Found'} substation: {substation.name}")
        )

        # Criar Rovers iniciais
        rovers_data = [
            {
                "identifier": "Rover-Argo-N-0",
                "name": "Rover Argo N0",
                "model": "Argo-N",
                "is_active": True
            },
            {
                "identifier": "Rover-Argo-N-1",
                "name": "Rover Argo N1",
                "model": "Argo-N",
                "is_active": True
            }
        ]

        for rover_data in rovers_data:
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
