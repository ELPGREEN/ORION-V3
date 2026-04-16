import paho.mqtt.client as mqtt
import json
import logging

logger = logging.getLogger(__name__)

class IoTManager:
    """
    Gerenciador de dispositivos IoT via MQTT (HiveMQ).
    """
    def __init__(self, broker="broker.hivemq.com", port=1883, base_topic="orion/iot"):
        self.broker = broker
        self.port = port
        self.base_topic = base_topic
        self.client = mqtt.Client()
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.last_message = None
        self.devices_count = 0 # Placeholder for actual device discovery

    def connect(self):
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            logger.info(f"Conectado ao broker MQTT {self.broker}")
        except Exception as e:
            logger.error(f"Erro ao conectar ao MQTT: {e}")

    def _on_connect(self, client, userdata, flags, rc):
        logger.info(f"Resultado da conexão MQTT: {rc}")
        self.client.subscribe(f"{self.base_topic}/#")

    def _on_message(self, client, userdata, msg):
        self.last_message = f"{msg.topic}: {msg.payload.decode()}"
        logger.info(f"Mensagem recebida no tópico {msg.topic}: {msg.payload.decode()}")

    def get_status(self):
        """Retorna o status atual da integração MQTT."""
        return {
            "connected": self.client.is_connected(),
            "broker": self.broker,
            "devices_count": self.devices_count,
            "last_message": self.last_message
        }

    def send_command(self, device, action, params=None):
        """Envia um comando para um dispositivo IoT."""
        topic = f"{self.base_topic}/{device}/{action}"
        payload = json.dumps(params) if params else "{}"
        self.client.publish(topic, payload)
        logger.info(f"Comando enviado: {topic} -> {payload}")

    def turn_on_light(self, room="sala"):
        self.send_command("luz", "ligar", {"comodo": room})

    def turn_off_light(self, room="sala"):
        self.send_command("luz", "desligar", {"comodo": room})
