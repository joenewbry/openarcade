# Foundry Frontier Acceptance Tests

## Core Flow
1. Player clears Stage 1 in <= 12 minutes using default starter state.
2. Stage transitions fail when prerequisite deliverables are missing.

## Crisis and Recovery
1. Oxygen deficit triggers recovery messaging and fail threshold timer.
2. Thermal spike can be recovered by valid cooling actions before fail threshold.

## Multiplayer Integrity
1. Co-op reconnect inside 60s restores authoritative state.
2. Desync triggers pause + reconciliation workflow.

## Replay
1. Seed + event log reproduces certification result deterministically.
