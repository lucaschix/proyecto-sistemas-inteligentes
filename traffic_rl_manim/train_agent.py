from __future__ import annotations

import random
from pathlib import Path

import numpy as np
import torch
from stable_baselines3 import DQN
from stable_baselines3.common.env_checker import check_env

from traffic_env import TrafficLightEnv


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "outputs" / "models"
MODEL_PATH = MODEL_DIR / "traffic_dqn"

SEED = 42
TOTAL_TIMESTEPS = 60_000


def configure_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def main() -> None:
    configure_seed(SEED)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    env = TrafficLightEnv(max_steps=200)

    print("Validando el entorno Gymnasium...")
    check_env(env, warn=True)

    print("Creando el agente DQN...")

    model = DQN(
        policy="MlpPolicy",
        env=env,
        learning_rate=1e-3,
        buffer_size=30_000,
        learning_starts=2_000,
        batch_size=64,
        gamma=0.95,
        train_freq=4,
        gradient_steps=1,
        target_update_interval=500,
        exploration_fraction=0.35,
        exploration_initial_eps=1.0,
        exploration_final_eps=0.05,
        policy_kwargs={
            "net_arch": [64, 64],
        },
        seed=SEED,
        verbose=1,
        device="auto",
    )

    print(f"Entrenando durante {TOTAL_TIMESTEPS} pasos...")

    model.learn(
        total_timesteps=TOTAL_TIMESTEPS,
        progress_bar=False,
    )

    model.save(MODEL_PATH)

    print("Entrenamiento completado.")
    print(f"Modelo guardado en: {MODEL_PATH}.zip")

    env.close()


if __name__ == "__main__":
    main()
