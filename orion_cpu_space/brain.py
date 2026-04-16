import logging
import json
import re
import webbrowser
from integrations.google_assistant import GoogleAssistantIntegrator
from integrations.iot_manager import IoTManager
from integrations.ble_manager import BLEManager
from integrations.ros2_manager import ROS2Manager
from memory import OrionMemory

logger = logging.getLogger(__name__)

class OrionAssistant:
    """
    O Cérebro Central do Órion.
    Orquestra intenções, memória, integrações e fallback para o Google Assistant.
    """

    def __init__(self):
        logger.info("Inicializando Órion Core...")
        self.memory = OrionMemory()

        # Inicializa integradores
        try:
            self.google = GoogleAssistantIntegrator()
        except Exception as e:
            logger.error(f"Falha ao iniciar Google Assistant Fallback: {e}")
            self.google = None

        self.iot = IoTManager()
        self.iot.connect()

        self.ble = BLEManager()
        self.ros2 = ROS2Manager()

        # Padrões de intenção (Regex simples para o MVP do novo cérebro)
        self.intent_patterns = {
            "media_video": r"(assistir|ver|abrir|mostrar|clipe|vídeo|video|youtube)",
            "media_music": r"(tocar|música|musica|ouvindo|som)",
            "iot_control": r"(ligue|desligue|apague|acenda|luz|lâmpada|dispositivo)",
            "ble_scan": r"(bluetooth|ble|parear|conectar dispositivo)",
            "ros2_robot": r"(status do robô|parada de emergência|linha de produção|robô|robot)",
            "legal_tech": r"(processo|petição|jurídico|cláusula|contrato|advogado)",
            "google_force": r"(pergunte ao google|use o google|busca no google)"
        }

    def process_with_google_enhancement(self, query: str) -> dict:
        """
        Ponto de entrada principal para processar comandos.
        """
        query = query.lower().strip()
        logger.info(f"Processando comando: {query}")

        # 1. Identificar intenção local
        intent = self._classify_intent(query)

        # 2. Verificar regras prioritárias (YouTube)
        media_action = self._check_media_rules(query, intent)
        if media_action:
            self.memory.add_interaction(query, media_action["response"], "media_priority")
            return media_action

        # 3. Executar ações diretas (IoT, ROS2, BLE)
        direct_action = self._execute_direct_action(query, intent)
        if direct_action:
            self.memory.add_interaction(query, direct_action["response"], intent)
            return direct_action

        # 4. Fallback para Google Assistant se for "google_force" ou intenção desconhecida
        if intent == "google_force" or intent == "unknown":
            if self.google:
                google_res = self.google.ask_google(query)
                processed_res = self._post_process_google_response(google_res)
                self.memory.add_interaction(query, processed_res["response"], "google_fallback")
                return processed_res
            else:
                return {"response": "Desculpe, meu motor do Google está offline e não sei processar isso localmente ainda."}

        # 5. Resposta padrão para intenções conhecidas mas não implementadas totalmente
        return {"response": f"Entendi que você quer tratar de '{intent}', mas ainda estou aprendendo a executar essa ação específica."}

    def _classify_intent(self, query: str) -> str:
        for intent, pattern in self.intent_patterns.items():
            if re.search(pattern, query):
                return intent
        return "unknown"

    def _check_media_rules(self, query: str, intent: str) -> dict:
        """Aplica a prioridade absoluta do YouTube."""
        is_video = intent == "media_video"
        is_music = intent == "media_music"

        # Se mencionar explicitamente Spotify ou Amazon, ignora prioridade YouTube
        if "spotify" in query or "amazon music" in query:
            return None

        if is_video or is_music:
            # Extrair o termo de busca (ex: "tocar música X" -> "X")
            search_term = re.sub(self.intent_patterns["media_video"], "", query)
            search_term = re.sub(self.intent_patterns["media_music"], "", search_term).strip()

            if not search_term:
                search_term = "músicas recomendadas"

            url = f"https://www.youtube.com/results?search_query={search_term.replace(' ', '+')}"
            # Em um sistema real com interface, enviaríamos um comando 'open_url'
            return {
                "response": f"Certo! Abrindo '{search_term}' no YouTube agora.",
                "action": "open_url",
                "url": url,
                "platform": "YouTube"
            }
        return None

    def _execute_direct_action(self, query: str, intent: str) -> dict:
        """Executa comandos para IoT, ROS2 e BLE."""
        if intent == "iot_control":
            if "ligue" in query or "acenda" in query:
                self.iot.turn_on_light()
                return {"response": "Comando enviado: Luz ligada."}
            elif "desligue" in query or "apague" in query:
                self.iot.turn_off_light()
                return {"response": "Comando enviado: Luz desligada."}

        elif intent == "ros2_robot":
            if "status" in query:
                status = self.ros2.get_robot_status()
                return {"response": f"Status do robô solicitado: {status['message']}"}
            elif "emergência" in query:
                self.ros2.emergency_stop()
                return {"response": "PARADA DE EMERGÊNCIA ACIONADA VIA ROS2!"}

        elif intent == "ble_scan":
            # Nota: Scan é assíncrono, aqui é apenas um placeholder de resposta
            return {"response": "Iniciando busca por dispositivos Bluetooth próximos..."}

        return None

    def _post_process_google_response(self, google_res: dict) -> dict:
        """
        Aplica as regras do Órion sobre a resposta do Google.
        """
        text = google_res.get("text_response", "Não obtive uma resposta clara do Google.")

        # Aqui o Órion "aprende" ou modifica a resposta
        # Exemplo: Se o Google sugerir algo de música mas não abriu o YouTube
        if "reproduzindo" in text.lower() or "música" in text.lower():
            if "youtube" not in text.lower():
                text += " (Nota: Eu priorizei o YouTube para esta ação)."

        return {
            "response": text,
            "google_structure": google_res, # Guardamos para estudo futuro
            "source": "Google Assistant + Orion Rules"
        }

if __name__ == "__main__":
    # Teste básico
    orion = OrionAssistant()

    print("\n--- Teste 1: Prioridade YouTube ---")
    print(orion.process_with_google_enhancement("tocar coldplay"))

    print("\n--- Teste 2: IoT Direto ---")
    print(orion.process_with_google_enhancement("ligue a luz da sala"))

    print("\n--- Teste 3: Google Fallback ---")
    print(orion.process_with_google_enhancement("Quem descobriu o Brasil?"))
