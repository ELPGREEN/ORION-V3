import logging
import json
import re
import time
import webbrowser
from integrations.google_assistant import GoogleAssistantIntegrator
from integrations.iot_manager import IoTManager
from integrations.ble_manager import BLEManager
from integrations.ros2_manager import ROS2Manager
from integrations import llm_chat
from memory import OrionMemory

logger = logging.getLogger(__name__)

class OrionAssistant:
    """
    O Cérebro Central do Órion.
    Orquestra intenções, memória, integrações e fallback para o Google Assistant.
    """

    def __init__(self):
        logger.info("Inicializando Órion Core...")
        self.start_time = time.time()
        self.version = "3.0.0"
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
            "media_video": r"(assistir|ver|abrir|mostrar|clipe|vídeo|video|youtube|filme|filmes|movie|movies|séries?|series?|novela|documentário|documentario|trailer|trailers|notícias|noticias|news|podcast|podcasts|meditação|meditacao|meditation|asmr|tutorial|tutoriais|react|review|unboxing|gameplay|playthrough|livestream|live|stream|transmissão|ao vivo|ted\s?talk|palestra|aula|curso|webinar|animação|animacao|anime|cartoon|desenho|curta|curta-metragem|show|espetáculo|concerto|ópera|opera|musical|standup|stand-up|comédia|comedia|drama|terror|horror|ação|acao|ficção|ficcao|romance|suspense|thriller)",
            "media_music": r"(tocar|música|musica|ouvindo|som|playlist|álbum|album|canção|cancao|song|beat|remix|lofi|lo-fi|chill|relaxar|relaxamento|dormir|sleep|foco|focus|estudar|study|treino|workout|gym)",
            "vision_detect": r"(detectar|identificar|objetos?|o que tem|câmera|camera|analisar imagem)",
            "vision_classify": r"(classificar|categorizar|que tipo|reconhecer|qual é isso)",
            "iot_control": r"(ligue|desligue|apague|acenda|luz|lâmpada|dispositivo)",
            "ble_scan": r"(bluetooth|ble|parear|conectar dispositivo)",
            "ros2_robot": r"(status do robô|parada de emergência|linha de produção|robô|robot)",
            "legal_tech": r"(processo|petição|jurídico|cláusula|contrato|advogado)",
            "google_force": r"(pergunte ao google|use o google|busca no google)"
        }

    def get_status(self) -> dict:
        """Retorna o status atual do sistema."""
        active_integrations = []
        if self.google: active_integrations.append("google_assistant")
        if self.iot: active_integrations.append("mqtt")
        if self.ble: active_integrations.append("ble")
        if self.ros2: active_integrations.append("ros2")

        return {
            "online": True,
            "version": self.version,
            "uptime_seconds": int(time.time() - self.start_time),
            "active_integrations": active_integrations,
            "intent_patterns": self.intent_patterns,
            "memory_entries": len(self.memory.history)
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
        """Executa comandos para IoT, ROS2, BLE e Vision."""
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
            return {"response": "Iniciando busca por dispositivos Bluetooth próximos..."}

        elif intent == "vision_detect":
            return {
                "response": "Módulo de visão ativo. Envie uma imagem para /vision/detect para detecção de objetos, ou use a câmera do app.",
                "action": "vision_ready",
                "endpoint": "/vision/detect",
                "intent": "vision_detect",
            }

        elif intent == "vision_classify":
            return {
                "response": "Módulo de classificação ativo. Envie uma imagem para /vision/classify para classificação zero-shot.",
                "action": "vision_ready",
                "endpoint": "/vision/classify",
                "intent": "vision_classify",
            }

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
            "google_structure": {
                "text_response": google_res.get("text_response"),
                "suggestions": google_res.get("suggestions", []),
                "action_data": google_res.get("action_data"),
                "supplemental_info": google_res.get("supplemental_info", {})
            },
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
