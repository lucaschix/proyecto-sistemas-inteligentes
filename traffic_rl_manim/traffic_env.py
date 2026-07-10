from __future__ import annotations

from typing import Any

import gymnasium as gym
import numpy as np
from gymnasium import spaces


class TrafficLightEnv(gym.Env):
    """
    Entorno educativo de una intersección controlada por un agente.

    Observación:
        Índice 0: vehículos esperando en dirección Norte-Sur.
        Índice 1: vehículos esperando en dirección Este-Oeste.
        Índice 2: semáforo actualmente activo.

    Acciones:
        0: luz verde para Norte-Sur.
        1: luz verde para Este-Oeste.

    Objetivo:
        Reducir la congestión y evitar cambios innecesarios de semáforo.
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        max_steps: int = 200,
        max_queue: float = 60.0,
        service_capacity: float = 5.0,
    ) -> None:
        super().__init__()

        self.max_steps = max_steps
        self.max_queue = max_queue
        self.service_capacity = service_capacity

        self.action_space = spaces.Discrete(2)

        self.observation_space = spaces.Box(
            low=np.array([0.0, 0.0, 0.0], dtype=np.float32),
            high=np.array(
                [self.max_queue, self.max_queue, 1.0],
                dtype=np.float32,
            ),
            dtype=np.float32,
        )

        self.queues = np.zeros(2, dtype=np.float32)
        self.current_light = 0
        self.current_step = 0

    def _get_observation(self) -> np.ndarray:
        return np.array(
            [
                self.queues[0],
                self.queues[1],
                float(self.current_light),
            ],
            dtype=np.float32,
        )

    def _get_info(self) -> dict[str, Any]:
        return {
            "north_south_queue": float(self.queues[0]),
            "east_west_queue": float(self.queues[1]),
            "light": int(self.current_light),
            "total_waiting": float(np.sum(self.queues)),
            "step": int(self.current_step),
        }

    def reset(
        self,
        seed: int | None = None,
        options: dict[str, Any] | None = None,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        super().reset(seed=seed)

        self.queues = self.np_random.integers(
            low=0,
            high=8,
            size=2,
        ).astype(np.float32)

        self.current_light = int(self.np_random.integers(0, 2))
        self.current_step = 0

        return self._get_observation(), self._get_info()

    def step(
        self,
        action: int,
    ) -> tuple[
        np.ndarray,
        float,
        bool,
        bool,
        dict[str, Any],
    ]:
        action = int(action)

        if not self.action_space.contains(action):
            raise ValueError(f"Acción inválida: {action}")

        previous_light = self.current_light
        self.current_light = action

        # La demanda cambia gradualmente para que el agente tenga que adaptarse.
        lambda_ns = 2.5 + np.sin(self.current_step / 15.0)
        lambda_ew = 2.5 + np.cos(self.current_step / 18.0)

        arrivals = self.np_random.poisson(
            lam=[lambda_ns, lambda_ew]
        ).astype(np.float32)

        self.queues += arrivals

        vehicles_served = min(
            self.service_capacity,
            float(self.queues[action]),
        )

        self.queues[action] -= vehicles_served
        self.queues = np.clip(
            self.queues,
            0.0,
            self.max_queue,
        )

        total_waiting = float(np.sum(self.queues))
        largest_queue = float(np.max(self.queues))

        switch_penalty = 0.0

        if previous_light != action:
            switch_penalty = 1.5

        # La recompensa aumenta cuando pasan vehículos y disminuye
        # cuando existen colas extensas o cambios frecuentes de semáforo.
        reward = (
            vehicles_served
            - (0.8 * total_waiting)
            - (0.2 * largest_queue)
            - switch_penalty
        )

        self.current_step += 1

        terminated = False
        truncated = self.current_step >= self.max_steps

        info = self._get_info()
        info.update(
            {
                "vehicles_arrived_ns": float(arrivals[0]),
                "vehicles_arrived_ew": float(arrivals[1]),
                "vehicles_served": float(vehicles_served),
                "switched_light": previous_light != action,
            }
        )

        return (
            self._get_observation(),
            float(reward),
            terminated,
            truncated,
            info,
        )
