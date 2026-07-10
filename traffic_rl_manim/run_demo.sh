#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "1. Entrenando agente DQN..."
python train_agent.py

echo
echo "2. Exportando trayectorias..."
python export_trajectories.py

echo
echo "3. Renderizando animación con Manim..."
if command -v manim >/dev/null 2>&1; then
    manim -pqh traffic_animation.py TrafficLearningScene
elif command -v docker >/dev/null 2>&1; then
    docker run --rm \
        -v "$SCRIPT_DIR":/manim \
        -w /manim \
        manimcommunity/manim:stable \
        manim -qh traffic_animation.py TrafficLearningScene
else
    echo "No se encontró manim ni docker para renderizar la animación." >&2
    exit 1
fi

echo
echo "Proceso completado."
echo "Revisa la carpeta media/ para encontrar el video generado."
