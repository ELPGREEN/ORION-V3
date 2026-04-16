import json
import os
import time
from collections import deque

class OrionMemory:
    """
    Sistema de memória persistente para o Órion.
    Mantém histórico de conversas e estado de contexto.
    """

    def __init__(self, storage_file='orion_memory.json', max_history=20):
        self.storage_file = storage_file
        self.max_history = max_history
        self.history = deque(maxlen=max_history)
        self.context = {}
        self._load_memory()

    def _load_memory(self):
        """Carrega a memória do disco se existir."""
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.history = deque(data.get('history', []), maxlen=self.max_history)
                    self.context = data.get('context', {})
            except Exception as e:
                print(f"Erro ao carregar memória: {e}")

    def save_memory(self):
        """Salva a memória no disco."""
        try:
            data = {
                'history': list(self.history),
                'context': self.context,
                'last_updated': time.time()
            }
            with open(self.storage_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Erro ao salvar memória: {e}")

    def add_interaction(self, user_query, assistant_response, intent=None):
        """Adiciona uma nova interação ao histórico."""
        interaction = {
            'timestamp': time.time(),
            'user': user_query,
            'assistant': assistant_response,
            'intent': intent
        }
        self.history.append(interaction)
        self.save_memory()

    def update_context(self, key, value):
        """Atualiza uma chave de contexto."""
        self.context[key] = value
        self.save_memory()

    def get_context(self):
        """Retorna o contexto atual."""
        return self.context

    def get_recent_history(self, limit=5):
        """Retorna as interações mais recentes."""
        return list(self.history)[-limit:]

    def clear_history(self):
        """Limpa o histórico de conversas."""
        self.history.clear()
        self.save_memory()

if __name__ == "__main__":
    mem = OrionMemory()
    mem.add_interaction("Olá Órion", "Olá, como posso ajudar?", "greeting")
    print(mem.get_recent_history())
