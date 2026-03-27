from pymodbus.client import ModbusTcpClient


class BCUClient:
    def __init__(self, ip, port=502, unit_id=1):
        self.ip = ip
        self.port = port
        self.unit_id = unit_id
        self._client = None

    def connect(self):
        self._client = ModbusTcpClient(self.ip, port=self.port, timeout=10)
        if not self._client.connect():
            raise RuntimeError(f"[BCU] Failed to connect to {self.ip}:{self.port}")
        print(f"[BCU] Connected to {self.ip}:{self.port}")

    def read_registers(self, address=0, count=6):
        """Read input registers. Returns list of floats scaled to -100..100."""
        rr = self._client.read_input_registers(address=address, count=count, device_id=self.unit_id)
        if rr.isError():
            raise IOError(f"[BCU] Modbus read error: {rr}")
        return [self._to_signed(v) / 100.0 for v in rr.registers]

    @staticmethod
    def _to_signed(u16):
        return u16 - 65536 if u16 >= 32768 else u16

    def close(self):
        if self._client:
            self._client.close()
            print("[BCU] Disconnected")
