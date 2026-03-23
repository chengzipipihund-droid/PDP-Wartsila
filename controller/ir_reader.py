#!/usr/bin/env python3
"""
IR Sensor Reader for Finnlines SmartNav Demo
Reads IR lever data from stdin (piped from serial or file) 
and outputs JSON to stdout for Node.js WebSocket server.

Usage:
  # From serial port:
  python3 ir_reader.py --serial /dev/ttyUSB0 --baud 9600

  # From file (for testing):
  cat Dataset.txt | python3 ir_reader.py --stdin

  # Piped to Node server:
  python3 ir_reader.py --serial /dev/ttyUSB0 | node server.js
"""

import sys
import json
import time
import argparse


def ir_to_percent(raw, min_val=-10000, max_val=10000):
    """Map raw IR value to 0-100 span.
    
    -10000 → 0   (full astern)
    0      → 50  (neutral / zero pitch)
    +10000 → 100 (full ahead)
    """
    return max(0.0, min(100.0, (raw - min_val) / (max_val - min_val) * 100))


def parse_ir_line(line):
    """Parse: 'IR[0]=-10000 | IR[1]=-8470 | ...' → list of ints"""
    values = []
    parts = line.strip().split('|')
    for part in parts:
        try:
            val = int(part.split('=')[1].strip())
            values.append(val)
        except (IndexError, ValueError):
            values.append(0)
    return values


def main():
    parser = argparse.ArgumentParser(description='IR Sensor Reader')
    parser.add_argument('--serial', type=str, help='Serial port path')
    parser.add_argument('--baud', type=int, default=9600)
    parser.add_argument('--stdin', action='store_true', help='Read from stdin')
    parser.add_argument('--rate', type=float, default=0.05, help='Output rate in seconds')
    args = parser.parse_args()

    source = None
    if args.serial:
        try:
            import serial
            source = serial.Serial(args.serial, args.baud)
            print(f"[IR Reader] Connected to {args.serial} @ {args.baud}", file=sys.stderr)
        except Exception as e:
            print(f"[IR Reader] Serial error: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        source = sys.stdin
        print("[IR Reader] Reading from stdin", file=sys.stderr)

    while True:
        try:
            if args.serial:
                line = source.readline().decode('utf-8', errors='ignore').strip()
            else:
                line = source.readline().strip()

            if not line or not line.startswith('IR'):
                continue

            raw = parse_ir_line(line)
            if len(raw) < 2:
                continue

            # IR[0] = Port CPP lever, IR[1] = Starboard CPP lever
            output = {
                "lever_a": round(ir_to_percent(raw[0]), 1),
                "lever_b": round(ir_to_percent(raw[1]), 1),
                "raw_a": raw[0],
                "raw_b": raw[1],
                "ts": int(time.time() * 1000),
            }

            # JSON to stdout → piped to Node.js
            print(json.dumps(output), flush=True)

            time.sleep(args.rate)

        except KeyboardInterrupt:
            print("\n[IR Reader] Stopped", file=sys.stderr)
            break
        except Exception as e:
            print(f"[IR Reader] Error: {e}", file=sys.stderr)
            continue


if __name__ == '__main__':
    main()
