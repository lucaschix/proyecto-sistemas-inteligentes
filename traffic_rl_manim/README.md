# Demostración DQN para control de tráfico

Este subproyecto muestra, de forma educativa, cómo un agente de aprendizaje por refuerzo puede controlar el semáforo de una intersección con dos direcciones: Norte-Sur y Este-Oeste.

El agente observa el estado del entorno, ejecuta acciones, recibe recompensas y aprende valores Q mediante una red neuronal DQN implementada con Stable-Baselines3. La demostración separa exploración, explotación, entrenamiento, exportación de trayectorias y visualización con Manim.

## Arquitectura

```text
Simulación de tráfico
        ↓
Entorno Gymnasium
        ↓
Agente DQN
        ↓
Red neuronal que estima valores Q
        ↓
Selección del semáforo
        ↓
Exportación de resultados
        ↓
Animación educativa con Manim
```

## Instalación en Ubuntu

```bash
cd traffic_rl_manim

python3 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

Si Manim presenta problemas de dependencias nativas:

```bash
sudo apt update

sudo apt install -y \
    build-essential \
    python3-dev \
    libcairo2-dev \
    libpango1.0-dev \
    ffmpeg \
    pkg-config
```

## Ejecución completa

```bash
./run_demo.sh
```

## Ejecución manual

```bash
python train_agent.py
python export_trajectories.py
manim -qm traffic_animation.py TrafficLearningScene
```

## Renderizado rápido para pruebas

```bash
manim -pql traffic_animation.py TrafficLearningScene
```

En entornos sin las dependencias nativas de Manim instaladas, puede usarse Docker:

```bash
docker run --rm \
    -v "$PWD":/manim \
    -w /manim \
    manimcommunity/manim:stable \
    manim -ql traffic_animation.py TrafficLearningScene
```

## Renderizado de calidad media

```bash
manim -qm traffic_animation.py TrafficLearningScene
```

## Archivos generados

```text
outputs/models/traffic_dqn.zip
outputs/trajectories/random_trajectory.json
outputs/trajectories/trained_trajectory.json
media/
```

`run_demo.sh` conserva la salida temporal dentro de `media/` y publica el video que usa la aplicación en `../assets/videos/traffic-learning.mp4`.
