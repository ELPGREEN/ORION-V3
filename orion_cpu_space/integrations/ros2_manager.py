import logging
import json

try:
    import rclpy
    from rclpy.node import Node
    from std_srvs.srv import Trigger, SetBool
    ROS2_AVAILABLE = True
except ImportError:
    ROS2_AVAILABLE = False

logger = logging.getLogger(__name__)

class ROS2Manager:
    """
    Interface de integração com o ecossistema ROS2.
    """
    def __init__(self):
        self.node = None
        self.last_heartbeat = None
        if ROS2_AVAILABLE:
            try:
                rclpy.init()
                self.node = Node("orion_assistant_bridge")
                logger.info("ROS2 inicializado e nó 'orion_assistant_bridge' criado.")
            except Exception as e:
                logger.error(f"Erro ao inicializar ROS2: {e}")
                self.node = None
        else:
            logger.warning("ROS2 (rclpy) não disponível neste ambiente.")

    def get_status(self):
        """Retorna o status atual da integração ROS2."""
        return {
            "connected": self.node is not None,
            "nodes": [self.node.get_name()] if self.node else [],
            "robot_status": "OK" if self.node else "OFFLINE",
            "last_heartbeat": self.last_heartbeat
        }

    def call_trigger_service(self, service_name):
        """Chama um serviço do tipo Trigger."""
        if not self.node:
            return {"success": False, "message": "ROS2 não disponível"}

        client = self.node.create_client(Trigger, service_name)
        while not client.wait_for_service(timeout_sec=1.0):
            logger.info(f"Aguardando serviço {service_name}...")
            return {"success": False, "message": "Serviço não disponível"}

        req = Trigger.Request()
        future = client.call_async(req)
        # Nota: Em uma aplicação real, você esperaria o future de forma assíncrona
        return {"success": True, "message": f"Chamada enviada para {service_name}"}

    def get_robot_status(self):
        """Exemplo: Obtém status do robô da linha de produção."""
        return self.call_trigger_service("/tire_line/get_line_status")

    def emergency_stop(self):
        """Aciona parada de emergência."""
        return self.call_trigger_service("/tire_line/emergency_stop")
