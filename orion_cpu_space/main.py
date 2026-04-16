import logging
import sys
from brain import OrionAssistant
from voice_interface import VoiceInterface

# Configuração de logging global
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('orion_core.log')
    ]
)

def main():
    print("""
    ================================================
           ÓRION CORE - NOVO ASSISTENTE V3
    ================================================
    """)

    # 1. Inicializa o Cérebro do Órion
    orion = OrionAssistant()

    # 2. Inicializa a Interface de Voz
    # Passamos o método de processamento do Órion como callback
    voice = VoiceInterface(assistant_callback=orion.process_with_google_enhancement)

    # 3. Escolha do modo de operação
    if "--voice" in sys.argv:
        # Modo voz ativa (exige microfone e dependências)
        voice.listen_for_wake_word()
    else:
        # Modo texto interativo (padrão para desenvolvimento)
        voice.start_interactive_cli()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nDesligando Órion...")
        sys.exit(0)
