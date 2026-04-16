import os
import json
import logging
import json
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
import google.auth.exceptions
from google.assistant.embedded.v1alpha2 import embedded_assistant_pb2
from google.assistant.embedded.v1alpha2 import embedded_assistant_pb2_grpc
import grpc

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GoogleAssistantIntegrator:
    """
    Integrador robusto com o Google Assistant SDK (gRPC).
    Responsável pela autenticação e comunicação com a API do Google.
    """

    SCOPES = ['https://www.googleapis.com/auth/assistant-sdk-prototype']

    def __init__(self, credentials_path='credentials.json', token_path='token.json'):
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.creds = None
        self.assistant = None
        self._authenticate()

    def _authenticate(self):
        """Realiza a autenticação OAuth2 e gera/carrega o token.json."""
        if os.path.exists(self.token_path):
            self.creds = Credentials.from_authorized_user_file(self.token_path, self.SCOPES)

        # Se não houver credenciais válidas, deixa o usuário logar.
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                logger.info("Atualizando token do Google Assistant...")
                try:
                    self.creds.refresh(Request())
                except Exception as e:
                    logger.error(f"Erro ao atualizar token: {e}. Por favor, re-autentique.")
                    self._run_new_auth_flow()
            else:
                self._run_new_auth_flow()

            # Salva as credenciais para a próxima vez
            with open(self.token_path, 'w') as token:
                token.write(self.creds.to_json())

        # Cria o canal gRPC
        self.channel = grpc.secure_channel(
            'embeddedassistant.googleapis.com',
            grpc.ssl_channel_credentials()
        )
        self.assistant = embedded_assistant_pb2_grpc.EmbeddedAssistantStub(self.channel)
        logger.info("Google Assistant Integrator autenticado com sucesso.")

    def _run_new_auth_flow(self):
        """Inicia o fluxo de autenticação manual."""
        if not os.path.exists(self.credentials_path):
            raise FileNotFoundError(f"Arquivo {self.credentials_path} não encontrado. "
                                    "Obtenha-o no Google Cloud Console.")

        flow = InstalledAppFlow.from_client_secrets_file(self.credentials_path, self.SCOPES)
        self.creds = flow.run_local_server(port=0)

    def ask_google(self, text_query: str) -> dict:
        """
        Envia uma consulta de texto para o Google Assistant e extrai a estrutura completa.
        """
        logger.info(f"Consultando Google Assistant: {text_query}")

        # Configuração da requisição
        config = embedded_assistant_pb2.AssistConfig(
            text_query=text_query,
            audio_out_config=embedded_assistant_pb2.AudioOutConfig(
                encoding='LINEAR16',
                sample_rate_hertz=16000,
                volume_percentage=100,
            ),
            dialog_state_in=embedded_assistant_pb2.DialogStateIn(
                language_code='pt-BR',
            ),
            device_config=embedded_assistant_pb2.DeviceConfig(
                device_id='orion_core_device',
                device_model_id='orion_assistant_model'
            )
        )

        def request_generator():
            yield embedded_assistant_pb2.AssistRequest(config=config)

        try:
            responses = self.assistant.Assist(request_generator(), metadata=[('authorization', f'Bearer {self.creds.token}')])

            full_result = {
                "text_response": "",
                "html_response": "",
                "suggestions": [],
                "action_data": None,
                "dialog_state_out": None,
                "debug_info": []
            }

            for resp in responses:
                if resp.dialog_state_out.supplemental_display_text:
                    full_result["text_response"] += resp.dialog_state_out.supplemental_display_text

                if resp.device_action.device_request_json:
                    full_result["action_data"] = json.loads(resp.device_action.device_request_json)

                if resp.dialog_state_out.conversation_state:
                    # Guardamos o estado para manter contexto no futuro
                    full_result["dialog_state_out"] = resp.dialog_state_out.conversation_state

                # Extrair sugestões (chips)
                if hasattr(resp.dialog_state_out, 'suggestions'):
                    for suggestion in resp.dialog_state_out.suggestions:
                        full_result["suggestions"].append(suggestion.title)

            return full_result

        except Exception as e:
            logger.error(f"Erro na consulta ao Google: {e}")
            return {"error": str(e)}

if __name__ == "__main__":
    # Teste rápido se rodado diretamente
    try:
        integrator = GoogleAssistantIntegrator()
        res = integrator.ask_google("Qual a previsão do tempo?")
        print(json.dumps(res, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Erro no teste: {e}")
