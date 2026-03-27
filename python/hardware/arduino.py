import re
import time
import threading
import serial


class ArduinoClient:
    def __init__(self, port, baud=115200):
        self.port = port
        self.baud = baud
        self._ser = None
        self._temperature = None
        self._lock = threading.Lock()
        self._running = False
        self._reader_thread = None

    def connect(self):
        """Connect to Arduino. Returns True on success, False if unavailable."""
        try:
            self._ser = serial.Serial(self.port, self.baud, timeout=1)
            time.sleep(2.0)  # wait for Arduino reset
            self._running = True
            self._reader_thread = threading.Thread(target=self._read_loop, daemon=True)
            self._reader_thread.start()
            print(f"[Arduino] Connected on {self.port} at {self.baud} baud")
            return True
        except serial.SerialException as e:
            print(f"[Arduino] Not available ({e}) — running without serial")
            return False

    # Patterns the Arduino sketch may send for temperature:
    #   "TEMP:22.44"   "Temperature: 22.44 C"   "22.44"   "T=22.44"
    _TEMP_PATTERNS = [
        re.compile(r'(?:TEMP|Temperature|T)[=:\s]+(-?\d+\.?\d*)', re.IGNORECASE),
        re.compile(r'^(-?\d+\.\d+)$'),   # bare float on its own line
    ]

    def _read_loop(self):
        """Background thread: reads temperature lines from Arduino."""
        while self._running and self._ser and self._ser.is_open:
            try:
                line = self._ser.readline().decode("ascii", errors="ignore").strip()
                if not line:
                    continue
                print(f"[Arduino] << {line}")   # debug: shows raw Arduino output
                for pattern in self._TEMP_PATTERNS:
                    match = pattern.search(line)
                    if match:
                        value = float(match.group(1))
                        with self._lock:
                            self._temperature = value
                        print(f"[Arduino] Temperature: {value} °C")
                        break
            except Exception:
                pass

    def get_temperature(self):
        """Return latest temperature reading, or None if unavailable."""
        with self._lock:
            return self._temperature

    def send_motor(self, m1, m2):
        self._write(f"M1:{m1}\nM2:{m2}\n")

    def send_servo(self, s1, s2):
        self._write(f"S1:{s1}\nS2:{s2}\n")

    def _write(self, text):
        if self._ser and self._ser.is_open:
            try:
                self._ser.write(text.encode("ascii"))
            except serial.SerialException:
                pass

    def stop(self):
        self._running = False
        if self._ser and self._ser.is_open:
            try:
                self._write("M1:0\nM2:0\n")
                self._ser.close()
                print("[Arduino] Disconnected")
            except Exception:
                pass
