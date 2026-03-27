def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def cmd_from_percent(percent, deadband=1.0):
    """Map -100..100 % → -255..255 PWM with deadband."""
    if abs(percent) < deadband:
        return 0
    return clamp(int(round((percent / 100.0) * 255)), -255, 255)


def servo_angle_from_percent(percent):
    """Map -100..100 % → 0..180 degrees."""
    return clamp(int(round(((percent + 100.0) / 200.0) * 180.0)), 0, 180)


def apply_ml_model(registers):
    """
    ML model hook — receives BCU register values, returns adjusted values.

    Swap the body with your trained model:

        from joblib import load
        _model = load("model.pkl")

        def apply_ml_model(registers):
            return _model.predict([registers])[0].tolist()

    Until a model is loaded this is a passthrough.
    """
    return registers
