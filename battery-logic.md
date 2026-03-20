# Battery and RPM Logic Documentation

## Overview
This document outlines the mathematical formulas and business logic for battery level management and RPM calculations in the Energy Dashboard application.

## Battery Level Management

### Default State
- **Initial Battery Level**: 100% (unless modified by external factors)
- **Synchronization**: Battery level must be consistent between the main dashboard (`BatteryPanel`) and the energy popup page (`EcoModeContent`)

### Consumption Logic
- **Assumption**: Autopilot mode suggests using Full Battery power for propulsion
- **Consumption Rate**: When RPM > 0, battery decreases over time
- **Formula**:
  ```
  consumption_rate_per_second = (current_rpm / 200) * (1 / 5)  # % per second
  ```
  - At 200 RPM: 1% battery consumed every 5 seconds (0.2% per second)
  - At 100 RPM: 0.5% battery consumed every 5 seconds (0.1% per second)
  - At 400 RPM: 2% battery consumed every 5 seconds (0.4% per second)

### Implementation
- Battery level updates every 1 second via `setInterval`
- Minimum battery level: 0%
- No automatic recharge logic implemented

## RPM Calculation

### Physics-Based Model
RPM is calculated using a physics simulation where lever position represents acceleration:

- **Lever Position (pos)**: -100 to +100 (acceleration in %)
- **RPM**: Speed equivalent (0 to 500 RPM)
- **Time-based Updates**: RPM updates every second based on acceleration

### Acceleration Rates
- **Positive Acceleration (pos ≥ 0)**:
  - RPM < 200: acceleration = (pos/100) × 10 RPM/s
    - At 100% pos: reaches 200 RPM in 20 seconds
  - RPM ≥ 200: acceleration = (pos/100) × 3.33 RPM/s
    - At 100% pos: reaches 400 RPM in ~60 seconds from 200 RPM
- **Negative Acceleration (pos < 0)**:
  - deceleration = (pos/100) × (current_RPM / 2) RPM/s
    - At -100% pos: stops to 0 RPM in 2 seconds

### Limits
- **Maximum RPM**: 500 RPM
- **Minimum RPM**: 0 RPM
- **Alarm Threshold**: 400 RPM (displays warning)

### Display Format
- RPM displays with 1 decimal place
- Values < 0.1 RPM show as 0

### Implementation
- Real-time simulation in `App.jsx` using `setInterval`
- Supports both hardware and manual lever control
- RPM affects battery consumption rate

## State Management
- All calculations performed in `App.jsx`
- States: `batteryLevel`, `rpm`, `alarm`
- Props passed to components: `BatteryPanel`, `EcoModeContent`, `Header`, `LeverPopup`

## Future Enhancements
- Implement battery recharge logic
- Add more sophisticated RPM acceleration curves
- Integrate with actual hardware sensors
- Add battery health degradation over time