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
                "latitude": -3.1230245597847435,  # Parnaíba
                "longitude": -41.76592329781182,  # Parnaíba
                "is_active": True
            }
        )

        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Found'} substation: {substation.name}")
        )

        # Criar Substation secundária
        substation2, created2 = Substation.objects.get_or_create(
            identifier="SUB002",
            defaults={
                "name": "Subestação Secundária",
                "latitude": -22.906847,  # Rio de Janeiro
                "longitude": -43.172897,  # Rio de Janeiro
                "is_active": True
            }
        )

        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created2 else 'Found'} substation: {substation2.name}")
        )

        # Criar Rovers iniciais para a primeira subestação
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

        # Criar Rovers para a subestação secundária
        rovers_data2 = [
            {
                "identifier": "Rover-Argo-S-0",
                "name": "Rover Argo S0",
                "model": "Argo-S",
                "is_active": True
            },
            {
                "identifier": "Rover-Argo-S-1",
                "name": "Rover Argo S1",
                "model": "Argo-S",
                "is_active": True
            },
            {
                "identifier": "Rover-Argo-S-2",
                "name": "Rover Argo S2",
                "model": "Argo-S",
                "is_active": True
            }
        ]

        for rover_data in rovers_data2:
            rover, created = Rover.objects.get_or_create(
                identifier=rover_data["identifier"],
                defaults={
                    **rover_data,
                    "substation": substation2
                }
            )
            self.stdout.write(
                self.style.SUCCESS(f"{'Created' if created else 'Found'} rover: {rover.name}")
            )
