# api/management/commands/setup_initial_data.py

from django.core.management.base import BaseCommand
from api.models import Rover, Substation

class Command(BaseCommand):
    help = "Setup initial data for the rover application"

    def handle(self, *args, **kwargs):
        # Criar ou atualizar Substation Parnaíba
        substation_parnaiba, created = Substation.objects.get_or_create(
            identifier="SUB001",
            defaults={
                "name": "SE Parnaíba III",
                "description": "Tensão: 500 kV",
                "latitude": -3.1230245597847435,  # Parnaíba
                "longitude": -41.76592329781182,  # Parnaíba
                "is_active": True
            }
        )
        # Atualizar nome e descrição mesmo se já existir
        substation_parnaiba.name = "SE Parnaíba III"
        substation_parnaiba.description = "Tensão: 500 kV"
        substation_parnaiba.save()

        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Updated'} substation: {substation_parnaiba.name}")
        )

        # Criar ou atualizar Substation Queimada Nova
        substation_queimada, created = Substation.objects.get_or_create(
            identifier="SUB002",
            defaults={
                "name": "SE Queimada Nova II",
                "description": "Tensão: 500 kV",
                "latitude": -8.588478706217613,  # Queimada Nova
                "longitude": -41.425289928836044,  # Queimada Nova
                "is_active": True
            }
        )
        # Atualizar nome e descrição mesmo se já existir
        substation_queimada.name = "SE Queimada Nova II"
        substation_queimada.description = "Tensão: 500 kV"
        substation_queimada.save()

        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Updated'} substation: {substation_queimada.name}")
        )

        # Criar Rover Alpha (Operacional) para Parnaíba
        rover_alpha_data = {
            "identifier": "Rover-Argo-N-0",
            "name": "Rover Alpha",
            "model": "Argo-N",
            "is_active": True,
            "battery_level": 85,
            "sensors": {
                "camera": "ok",
                "temperature": "ok",
                "humidity": "ok",
                "pressure": "ok"
            },
            "alerts": []
        }

        rover_alpha, created = Rover.objects.get_or_create(
            identifier=rover_alpha_data["identifier"],
            defaults={
                **rover_alpha_data,
                "substation": substation_parnaiba
            }
        )
        
        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Found'} rover: {rover_alpha.name}")
        )

        # Criar Rover Beta (Em Manutenção) para Parnaíba
        rover_beta_data = {
            "identifier": "Rover-Beta",
            "name": "Rover Beta",
            "model": "Argo-N",
            "is_active": False,
            "battery_level": 25,
            "sensors": {
                "camera": "warning",
                "temperature": "error",
                "humidity": "ok",
                "pressure": "warning"
            },
            "alerts": [
                {
                    "type": "error",
                    "message": "Falha no sensor de temperatura",
                    "timestamp": "2024-03-20T10:30:00"
                },
                {
                    "type": "warning",
                    "message": "Bateria em nível crítico",
                    "timestamp": "2024-03-20T10:15:00"
                }
            ]
        }

        rover_beta, created = Rover.objects.get_or_create(
            identifier=rover_beta_data["identifier"],
            defaults={
                **rover_beta_data,
                "substation": substation_parnaiba
            }
        )
        
        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Found'} rover: {rover_beta.name}")
        )

        # Criar Rover Gamma (Operacional com Alertas) para Queimada Nova
        rover_gamma_data = {
            "identifier": "Rover-Gamma",
            "name": "Rover Gamma",
            "model": "Argo-N",
            "is_active": True,
            "battery_level": 45,
            "sensors": {
                "camera": "ok",
                "temperature": "warning",
                "humidity": "ok",
                "pressure": "ok"
            },
            "alerts": [
                {
                    "type": "warning",
                    "message": "Temperatura acima do normal",
                    "timestamp": "2024-03-20T11:00:00"
                }
            ]
        }

        rover_gamma, created = Rover.objects.get_or_create(
            identifier=rover_gamma_data["identifier"],
            defaults={
                **rover_gamma_data,
                "substation": substation_queimada
            }
        )
        
        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Found'} rover: {rover_gamma.name}")
        )
