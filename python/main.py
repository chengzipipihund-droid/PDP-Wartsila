import time
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from hardware.bcu     import BCUClient
from hardware.arduino import ArduinoClient
from hardware.thruster import ThrusterController
from control.lever    import cmd_from_percent, servo_angle_from_percent, apply_ml_model
from comms.udp        import UDPSender

# ── Config ───────────────────────────────────────────────────────────────────
BCU_IP        = "192.168.1.17"
SERIAL_PORT   = "COM4"
SERIAL_BAUD   = 115200
UDP_HOST      = "127.0.0.1"
UDP_PORT      = 3002
POLL_HZ       = 10       # BCU polling rate (max 10 Hz)
SEND_HZ_LIMIT = 20       # max serial write rate
# ─────────────────────────────────────────────────────────────────────────────


def main():
    udp      = UDPSender(UDP_HOST, UDP_PORT)
    bcu      = BCUClient(BCU_IP)
    arduino  = ArduinoClient(SERIAL_PORT, SERIAL_BAUD)
    thruster = ThrusterController()

    bcu.connect()
    arduino.connect()  # non-fatal — runs without Arduino if unavailable

    print(f"[Main] Running at {POLL_HZ} Hz. Ctrl+C to stop.")

    period         = 1.0 / POLL_HZ
    last_m1        = None
    last_m2        = None
    last_send_time = 0.0

    try:
        while True:
            t0 = time.time()

            # ── 1. Read BCU registers ─────────────────────────────────────
            registers = bcu.read_registers()

            # ── 2. Apply ML model (passthrough until model is ready) ──────
            registers = apply_ml_model(registers)

            # ── 3. Send BCU data to website ───────────────────────────────
            print(" | ".join(f"IR[{i}]={v:.1f}%" for i, v in enumerate(registers)))
            udp.send("BCU_DATA", registers=registers)

            # ── 4. Compute & send motor / servo commands to Arduino ───────
            m1 = cmd_from_percent(registers[0])
            m2 = cmd_from_percent(registers[2])
            s1 = servo_angle_from_percent(registers[4])
            s2 = servo_angle_from_percent(registers[5])

            arduino.send_servo(s1, s2)

            now = time.time()
            if (m1 != last_m1 or m2 != last_m2) and \
               (now - last_send_time) >= (1.0 / SEND_HZ_LIMIT):
                arduino.send_motor(m1, m2)
                last_m1, last_m2 = m1, m2
                last_send_time = now

            # ── 5. Update & send thruster state ──────────────────────────
            thruster.update(registers)
            udp.send("THRUSTER_DATA", **thruster.get_state())

            # ── 6. Read & send temperature ────────────────────────────────
            temp = arduino.get_temperature()
            if temp is not None:
                udp.send("TEMPERATURE", value=temp)

            # ── 7. Pace loop ──────────────────────────────────────────────
            elapsed = time.time() - t0
            if elapsed < period:
                time.sleep(period - elapsed)

    except KeyboardInterrupt:
        print("\n[Main] Stopping...")
    finally:
        arduino.stop()
        bcu.close()
        udp.close()


if __name__ == "__main__":
    main()
