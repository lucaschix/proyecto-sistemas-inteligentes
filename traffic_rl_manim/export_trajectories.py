from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import numpy as np
from stable_baselines3 import DQN

from traffic_env import TrafficLightEnv

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "outputs" / "models" / "traffic_dqn"
TRAJECTORY_DIR = BASE_DIR / "outputs" / "trajectories"
EPISODE_STEPS = 80
DEMO_SEED = 123
EVALUATION_SEEDS = tuple(range(200, 220))


@dataclass(frozen=True)
class Decision:
    action: int
    decision_type: str
    q_values: list[float] | None = None


DecisionSelector = Callable[[np.ndarray, TrafficLightEnv], Decision]


def random_selector(observation: np.ndarray, env: TrafficLightEnv) -> Decision:
    del observation
    return Decision(action=int(env.action_space.sample()), decision_type="exploration")


def trained_selector(model: DQN) -> DecisionSelector:
    def select(observation: np.ndarray, env: TrafficLightEnv) -> Decision:
        del env
        action, _ = model.predict(observation, deterministic=True)
        obs_tensor, _ = model.policy.obs_to_tensor(observation)
        q_tensor = model.q_net(obs_tensor)
        q_values = q_tensor.detach().cpu().numpy()[0].astype(float).tolist()
        return Decision(
            action=int(action),
            decision_type="exploitation",
            q_values=q_values,
        )

    return select


def run_episode(
    policy_name: str,
    action_selector: DecisionSelector,
    seed: int,
) -> dict[str, Any]:
    env = TrafficLightEnv(max_steps=EPISODE_STEPS)
    env.action_space.seed(seed)
    observation, _ = env.reset(seed=seed)

    trajectory: list[dict[str, Any]] = []
    queue_values: list[float] = []
    total_reward = 0.0
    total_served = 0.0
    switch_count = 0
    congested_steps = 0
    finished = False

    while not finished:
        decision = action_selector(observation, env)
        next_observation, reward, terminated, truncated, info = env.step(decision.action)

        total_waiting = float(info["total_waiting"])
        vehicles_served = float(info["vehicles_served"])
        switched = bool(info["switched_light"])

        queue_values.append(total_waiting)
        total_reward += float(reward)
        total_served += vehicles_served
        switch_count += int(switched)
        congested_steps += int(total_waiting >= 30.0)

        trajectory.append(
            {
                "step": int(info["step"]),
                "north_south": float(info["north_south_queue"]),
                "east_west": float(info["east_west_queue"]),
                "light": int(info["light"]),
                "action": int(decision.action),
                "decision_type": decision.decision_type,
                "q_values": decision.q_values,
                "reward": float(reward),
                "cumulative_reward": float(total_reward),
                "total_waiting": total_waiting,
                "vehicles_served": vehicles_served,
                "vehicles_arrived_ns": float(info.get("vehicles_arrived_ns", 0.0)),
                "vehicles_arrived_ew": float(info.get("vehicles_arrived_ew", 0.0)),
                "switched_light": switched,
            }
        )

        observation = next_observation
        finished = terminated or truncated

    env.close()
    return {
        "policy": policy_name,
        "seed": seed,
        "metadata": {
            "steps": len(trajectory),
            "total_reward": float(total_reward),
            "average_queue": float(np.mean(queue_values)),
            "maximum_queue": float(np.max(queue_values)),
            "vehicles_served": float(total_served),
            "switches": int(switch_count),
            "congested_steps": int(congested_steps),
        },
        "steps": trajectory,
    }


def aggregate_results(results: list[dict[str, Any]]) -> dict[str, float]:
    keys = (
        "total_reward",
        "average_queue",
        "maximum_queue",
        "vehicles_served",
        "switches",
        "congested_steps",
    )
    return {
        key: float(np.mean([result["metadata"][key] for result in results]))
        for key in keys
    }


def save_json(filename: str, data: dict[str, Any]) -> None:
    path = TRAJECTORY_DIR / filename
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    print(f"Archivo guardado: {path}")


def main() -> None:
    TRAJECTORY_DIR.mkdir(parents=True, exist_ok=True)
    model_file = MODEL_PATH.with_suffix(".zip")
    if not model_file.exists():
        raise FileNotFoundError(
            f"No se encontró {model_file}. Ejecuta primero: python train_agent.py"
        )

    model = DQN.load(MODEL_PATH)
    dqn_selector = trained_selector(model)

    random_demo = run_episode("Agente aleatorio", random_selector, DEMO_SEED)
    trained_demo = run_episode("Agente DQN entrenado", dqn_selector, DEMO_SEED)
    save_json("random_trajectory.json", random_demo)
    save_json("trained_trajectory.json", trained_demo)

    random_evaluations = [
        run_episode("Agente aleatorio", random_selector, seed)
        for seed in EVALUATION_SEEDS
    ]
    trained_evaluations = [
        run_episode("Agente DQN entrenado", dqn_selector, seed)
        for seed in EVALUATION_SEEDS
    ]
    summary = {
        "episode_steps": EPISODE_STEPS,
        "seeds": list(EVALUATION_SEEDS),
        "random": aggregate_results(random_evaluations),
        "trained": aggregate_results(trained_evaluations),
    }
    save_json("evaluation_summary.json", summary)

    print("\nResumen de evaluación (20 semillas)")
    print("-----------------------------------")
    for policy in ("random", "trained"):
        metrics = summary[policy]
        print(
            f"{policy:>7}: cola={metrics['average_queue']:.2f}, "
            f"recompensa={metrics['total_reward']:.2f}, "
            f"atendidos={metrics['vehicles_served']:.1f}, "
            f"cambios={metrics['switches']:.1f}"
        )


if __name__ == "__main__":
    main()
