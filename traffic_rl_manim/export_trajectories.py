from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

import numpy as np
from stable_baselines3 import DQN

from traffic_env import TrafficLightEnv


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "outputs" / "models" / "traffic_dqn"
TRAJECTORY_DIR = BASE_DIR / "outputs" / "trajectories"

EPISODE_STEPS = 60
SEED = 123


def run_episode(
    policy_name: str,
    action_selector: Callable[[np.ndarray, TrafficLightEnv], int],
) -> dict[str, Any]:
    env = TrafficLightEnv(max_steps=EPISODE_STEPS)
    env.action_space.seed(SEED)

    observation, info = env.reset(seed=SEED)

    trajectory: list[dict[str, Any]] = []
    finished = False
    total_reward = 0.0
    queue_values: list[float] = []

    while not finished:
        action = int(action_selector(observation, env))

        next_observation, reward, terminated, truncated, info = env.step(
            action
        )

        total_waiting = float(info["total_waiting"])
        queue_values.append(total_waiting)
        total_reward += float(reward)

        trajectory.append(
            {
                "step": int(info["step"]),
                "north_south": float(info["north_south_queue"]),
                "east_west": float(info["east_west_queue"]),
                "light": int(info["light"]),
                "action": int(action),
                "reward": float(reward),
                "total_waiting": total_waiting,
                "vehicles_served": float(info["vehicles_served"]),
                "switched_light": bool(info["switched_light"]),
            }
        )

        observation = next_observation
        finished = terminated or truncated

    env.close()

    return {
        "policy": policy_name,
        "metadata": {
            "steps": len(trajectory),
            "total_reward": float(total_reward),
            "average_queue": float(np.mean(queue_values)),
            "maximum_queue": float(np.max(queue_values)),
        },
        "steps": trajectory,
    }


def save_json(
    filename: str,
    data: dict[str, Any],
) -> None:
    path = TRAJECTORY_DIR / filename

    with path.open("w", encoding="utf-8") as file:
        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2,
        )

    print(f"Trayectoria guardada en: {path}")


def main() -> None:
    TRAJECTORY_DIR.mkdir(parents=True, exist_ok=True)

    model_file = MODEL_PATH.with_suffix(".zip")

    if not model_file.exists():
        raise FileNotFoundError(
            "No se encontró el modelo entrenado. "
            "Ejecuta primero: python train_agent.py"
        )

    model = DQN.load(MODEL_PATH)

    random_result = run_episode(
        policy_name="Agente aleatorio",
        action_selector=lambda observation, env: env.action_space.sample(),
    )

    trained_result = run_episode(
        policy_name="Agente DQN entrenado",
        action_selector=lambda observation, env: int(
            model.predict(
                observation,
                deterministic=True,
            )[0]
        ),
    )

    save_json(
        "random_trajectory.json",
        random_result,
    )

    save_json(
        "trained_trajectory.json",
        trained_result,
    )

    print()
    print("Resumen comparativo")
    print("-------------------")
    print(
        "Agente aleatorio - cola promedio:",
        round(random_result["metadata"]["average_queue"], 2),
    )
    print(
        "Agente entrenado - cola promedio:",
        round(trained_result["metadata"]["average_queue"], 2),
    )
    print(
        "Agente aleatorio - recompensa total:",
        round(random_result["metadata"]["total_reward"], 2),
    )
    print(
        "Agente entrenado - recompensa total:",
        round(trained_result["metadata"]["total_reward"], 2),
    )


if __name__ == "__main__":
    main()
