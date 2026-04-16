import logging
import time
import queue
import sys

# Bibliotecas sugeridas (instalar via pip)
# pip install SpeechRecognition google-cloud-speech pydub

try:
    import speech_recognition as sr
except ImportError:
    sr = None

logger = logging.getLogger(__name__)

class VoiceInterface:
    """
    Interface de Voz para o Órion.
    Gerencia microfone, detecção de wake word e STT/TTS.
    """

    def __init__(self, assistant_callback):
        self.assistant_callback = assistant_callback
        self.recognizer = sr.Recognizer() if sr else None
        self.microphone = sr.Microphone() if sr else None
        self.is_listening = False

        if not sr:
            logger.warning("speech_recognition não instalado. Apenas entrada via texto funcionará.")

    def listen_for_wake_word(self):
        """
        Loop de escuta para a Wake Word 'Órion' ou 'Hey Órion'.
        Implementação simplificada usando SpeechRecognition.
        """
        if not self.recognizer:
            return

        logger.info("Órion está ouvindo... (Diga 'Órion' ou 'Hey Órion')")

        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source)
            while True:
                try:
                    audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=5)
                    text = self.recognizer.recognize_google(audio, language='pt-BR').lower()

                    if "órin" in text or "orion" in text or "hey orion" in text:
                        logger.info("Wake word detectada!")
                        self._process_voice_command(source)

                except sr.WaitTimeoutError:
                    continue
                except Exception as e:
                    logger.debug(f"Ruído ou erro: {e}")
                    continue

    def _process_voice_command(self, source):
        """Captura o comando após a wake word."""
        logger.info("Sim, estou ouvindo... Qual o seu comando?")
        # Em um sistema real, aqui tocaria um bipe

        try:
            audio = self.recognizer.listen(source, timeout=10, phrase_time_limit=10)
            command = self.recognizer.recognize_google(audio, language='pt-BR')
            logger.info(f"Comando capturado: {command}")

            # Chama o Cérebro Central
            response = self.assistant_callback(command)

            # Fala a resposta
            self.speak(response.get("response", ""))

        except Exception as e:
            logger.error(f"Erro ao capturar comando: {e}")

    def speak(self, text):
        """
        Transforma texto em fala (TTS).
        Pode usar Web Speech API no frontend ou ElevenLabs/gTTS no backend.
        """
        logger.info(f"Órion diz: {text}")
        # Placeholder para integração com ElevenLabs ou TTS local
        # os.system(f"say '{text}'") # Exemplo para macOS

    def start_interactive_cli(self):
        """Modo de texto para testes rápidos."""
        print("\n--- Órion Interactive CLI ---")
        print("Digite seu comando (ou 'sair' para encerrar):")
        while True:
            try:
                query = input("\nVocê: ")
                if query.lower() in ['sair', 'exit', 'quit']:
                    break

                res = self.assistant_callback(query)
                print(f"Órion: {res.get('response')}")
                if "url" in res:
                    print(f"[Ação]: Abrindo URL {res['url']}")

            except KeyboardInterrupt:
                break

if __name__ == "__main__":
    # Teste da interface
    def mock_callback(q):
        return {"response": f"Recebi seu comando: {q}"}

    vi = VoiceInterface(mock_callback)
    vi.start_interactive_cli()
