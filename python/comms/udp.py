import json
import socket


class UDPSender:
    """Send typed JSON messages to the Node.js server over UDP."""

    def __init__(self, host="127.0.0.1", port=3002):
        self.host = host
        self.port = port
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    def send(self, msg_type, **data):
        """
        Send a typed message.
        Example: sender.send("BCU_DATA", registers=[0.0, 1.5, ...])
        """
        payload = json.dumps({"type": msg_type, **data}).encode()
        self._sock.sendto(payload, (self.host, self.port))

    def close(self):
        self._sock.close()
