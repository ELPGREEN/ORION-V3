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

    async def scan(self, duration=5.0):
        """Escaneia dispositivos BLE próximos."""
        logger.info("Iniciando scan BLE...")
        self.devices = await BleakScanner.discover(timeout=duration)
        for d in self.devices:
            logger.info(f"Dispositivo encontrado: {d.name} ({d.address})")
        return self.devices

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
