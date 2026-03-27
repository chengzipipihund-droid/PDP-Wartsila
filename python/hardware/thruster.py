class ThrusterController:
    """
    Thruster setpoint calculator.

    Current state: passthrough placeholder.
    Future: add thruster allocation logic, saturation limits,
            or a trained ML model here.

    Thrusters:
        port      — port-side main thruster   (-100..100 %)
        starboard — starboard main thruster   (-100..100 %)
        bow       — bow thruster              (-100..100 %)
    """

    def __init__(self):
        self.port = 0.0
        self.starboard = 0.0
        self.bow = 0.0

    def update(self, registers):
        """
        Compute thruster setpoints from BCU register values.

        registers[0] — main lever (port + starboard)
        registers[2] — bow thruster lever
        """
        self.port      = registers[0] if len(registers) > 0 else 0.0
        self.starboard = registers[0] if len(registers) > 0 else 0.0
        self.bow       = registers[2] if len(registers) > 2 else 0.0

    def get_state(self):
        return {
            "port":      round(self.port, 2),
            "starboard": round(self.starboard, 2),
            "bow":       round(self.bow, 2),
        }
