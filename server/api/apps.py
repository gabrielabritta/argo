# api/apps.py
from django.apps import AppConfig
import os
import logging

logger = logging.getLogger(__name__)

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    mqtt_handler = None

    def ready(self):
        if os.environ.get('RUN_MAIN', None) != 'true':
            logger.info("Iniciando MQTT Handler...")
            from .mqtt_handler import MQTTHandler
            try:
                self.mqtt_handler = MQTTHandler()
                self.mqtt_handler.connect()
                logger.info("MQTT Handler iniciado com sucesso!")
            except Exception as e:
                logger.error(f"Erro ao iniciar MQTT Handler: {e}", exc_info=True)
