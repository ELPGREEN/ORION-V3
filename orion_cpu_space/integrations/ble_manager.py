import asyncio
import logging
from bleak import BleakScanner, BleakClient

logger = logging.getLogger(__name__)

class BLEManager:
    """
    Gerenciador de dispositivos Bluetooth Low Energy (BLE).
    """
    def __init__(self):
        self.devices = []
        self.is_scanning = False

    def get_status(self):
        """Retorna o status atual da integração BLE."""
        return {
            "scanning": self.is_scanning,
            "paired_devices": len(self.devices),
            "supported": True # Assumindo suporte se a lib carregou
        }

    async def scan(self, duration=5.0):
        """Escaneia dispositivos BLE próximos."""
        logger.info("Iniciando scan BLE...")
        self.is_scanning = True
        try:
            self.devices = await BleakScanner.discover(timeout=duration)
            for d in self.devices:
                logger.info(f"Dispositivo encontrado: {d.name} ({d.address})")
            return self.devices
        finally:
            self.is_scanning = False

    async def connect_and_read(self, address, char_uuid):
        """Conecta a um dispositivo e lê uma característica."""
        async with BleakClient(address) as client:
            if client.is_connected:
                logger.info(f"Conectado a {address}")
                value = await client.read_gatt_char(char_uuid)
                return value
            else:
                logger.error(f"Falha ao conectar a {address}")
                return None

    def run_sync_scan(self):
        """Roda o scan de forma síncrona (helper)."""
        return asyncio.run(self.scan())
