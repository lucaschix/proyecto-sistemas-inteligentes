from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from manim import (
    BLUE,
    DOWN,
    FadeIn,
    FadeOut,
    GREEN,
    GREY,
    LEFT,
    Line,
    ORIGIN,
    RED,
    RIGHT,
    RoundedRectangle,
    Scene,
    Text,
    UP,
    VGroup,
    ValueTracker,
    WHITE,
    YELLOW,
    always_redraw,
    Circle,
    DashedLine,
    Rectangle,
)


BASE_DIR = Path(__file__).resolve().parent
TRAJECTORY_DIR = BASE_DIR / "outputs" / "trajectories"


class TrafficLearningScene(Scene):
    def construct(self) -> None:
        random_data = self.load_json("random_trajectory.json")
        trained_data = self.load_json("trained_trajectory.json")

        self.show_introduction()
        self.fade_all()

        self.show_network()
        self.fade_all()

        self.run_simulation(
            random_data,
            "Antes del entrenamiento: decisiones aleatorias",
            BLUE,
        )

        self.fade_all()

        self.run_simulation(
            trained_data,
            "Después del entrenamiento: agente DQN",
            GREEN,
        )

        self.fade_all()

        self.show_comparison(
            random_data,
            trained_data,
        )

    def load_json(self, filename: str) -> dict[str, Any]:
        path = TRAJECTORY_DIR / filename

        if not path.exists():
            raise FileNotFoundError(
                f"No se encontró {path}. "
                "Ejecuta primero export_trajectories.py."
            )

        with path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def fade_all(self) -> None:
        if self.mobjects:
            self.play(
                *[
                    FadeOut(mobject)
                    for mobject in list(self.mobjects)
                ],
                run_time=0.5,
            )

    def show_introduction(self) -> None:
        title = Text(
            "Aprendizaje por refuerzo aplicado al tráfico",
            font_size=40,
        ).to_edge(UP)

        description = Text(
            "El agente aprende cuándo cambiar el semáforo\n"
            "para reducir la cantidad de vehículos esperando.",
            font_size=28,
            line_spacing=1.2,
        )

        cycle = Text(
            "Estado  →  Acción  →  Recompensa  →  Aprendizaje",
            font_size=28,
            color=YELLOW,
        ).next_to(description, DOWN, buff=0.7)

        details = VGroup(
            Text("Observa: colas N-S, E-O y luz activa", font_size=23),
            Text("Acciones: verde para N-S o verde para E-O", font_size=23),
            Text("Recompensa: menos espera y menos cambios innecesarios", font_size=23),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.22).to_edge(DOWN)

        self.play(FadeIn(title))
        self.play(FadeIn(description))
        self.play(FadeIn(cycle))
        self.play(FadeIn(details))
        self.wait(2)

    def show_network(self) -> None:
        title = Text(
            "Red neuronal utilizada por el agente DQN",
            font_size=36,
        ).to_edge(UP)

        input_labels = [
            "Cola N-S",
            "Cola E-O",
            "Semáforo",
        ]

        output_labels = [
            "Q(verde N-S)",
            "Q(verde E-O)",
        ]

        input_nodes = VGroup(
            *[
                Circle(
                    radius=0.28,
                    color=BLUE,
                    fill_opacity=0.8,
                ).move_to(
                    LEFT * 4 + UP * (1.2 - index * 1.2)
                )
                for index in range(3)
            ]
        )

        hidden_nodes = VGroup(
            *[
                Circle(
                    radius=0.24,
                    color=YELLOW,
                    fill_opacity=0.8,
                ).move_to(
                    ORIGIN + UP * (1.6 - index * 0.8)
                )
                for index in range(5)
            ]
        )

        output_nodes = VGroup(
            *[
                Circle(
                    radius=0.28,
                    color=GREEN,
                    fill_opacity=0.8,
                ).move_to(
                    RIGHT * 4 + UP * (0.6 - index * 1.2)
                )
                for index in range(2)
            ]
        )

        connections = VGroup()

        for input_node in input_nodes:
            for hidden_node in hidden_nodes:
                connections.add(
                    Line(
                        input_node.get_right(),
                        hidden_node.get_left(),
                        stroke_opacity=0.35,
                    )
                )

        for hidden_node in hidden_nodes:
            for output_node in output_nodes:
                connections.add(
                    Line(
                        hidden_node.get_right(),
                        output_node.get_left(),
                        stroke_opacity=0.35,
                    )
                )

        input_texts = VGroup(
            *[
                Text(
                    label,
                    font_size=20,
                ).next_to(node, LEFT)
                for label, node in zip(
                    input_labels,
                    input_nodes,
                )
            ]
        )

        output_texts = VGroup(
            *[
                Text(
                    label,
                    font_size=20,
                ).next_to(node, RIGHT)
                for label, node in zip(
                    output_labels,
                    output_nodes,
                )
            ]
        )

        explanation = Text(
            "La red estima el valor Q de cada acción.\n"
            "El agente selecciona la acción con mayor valor.",
            font_size=25,
        ).to_edge(DOWN)

        self.play(FadeIn(title))
        self.play(FadeIn(connections))
        self.play(
            FadeIn(input_nodes),
            FadeIn(hidden_nodes),
            FadeIn(output_nodes),
        )
        self.play(
            FadeIn(input_texts),
            FadeIn(output_texts),
        )
        self.play(FadeIn(explanation))
        self.wait(3)

    def create_north_south_cars(
        self,
        count: int,
    ) -> VGroup:
        group = VGroup()
        visible_count = min(max(count, 0), 6)

        for index in range(visible_count):
            car = RoundedRectangle(
                width=0.42,
                height=0.25,
                corner_radius=0.06,
                color=WHITE,
                fill_opacity=0.9,
            )

            car.move_to(
                RIGHT * 0.35
                + UP * (1.45 + index * 0.32)
            )

            group.add(car)

        if count > 6:
            overflow = Text(
                f"+{count - 6}",
                font_size=18,
                color=YELLOW,
            ).move_to(
                RIGHT * 0.95 + UP * 2.9
            )

            group.add(overflow)

        if len(group) == 0:
            placeholder = Circle(radius=0.01).set_opacity(0)
            group.add(placeholder)

        return group

    def create_east_west_cars(
        self,
        count: int,
    ) -> VGroup:
        group = VGroup()
        visible_count = min(max(count, 0), 6)

        for index in range(visible_count):
            car = RoundedRectangle(
                width=0.48,
                height=0.25,
                corner_radius=0.06,
                color=WHITE,
                fill_opacity=0.9,
            )

            car.move_to(
                LEFT * (1.55 + index * 0.58)
                + DOWN * 0.35
            )

            group.add(car)

        if count > 6:
            overflow = Text(
                f"+{count - 6}",
                font_size=18,
                color=YELLOW,
            ).move_to(
                LEFT * 4.7 + DOWN * 0.8
            )

            group.add(overflow)

        if len(group) == 0:
            placeholder = Circle(radius=0.01).set_opacity(0)
            group.add(placeholder)

        return group

    def run_simulation(
        self,
        data: dict[str, Any],
        heading_text: str,
        accent_color,
    ) -> None:
        heading = Text(
            heading_text,
            font_size=32,
            color=accent_color,
        ).to_edge(UP)

        horizontal_road = Rectangle(
            width=11.5,
            height=2.0,
            color=GREY,
            fill_color=GREY,
            fill_opacity=0.35,
        )

        vertical_road = Rectangle(
            width=2.0,
            height=6.0,
            color=GREY,
            fill_color=GREY,
            fill_opacity=0.35,
        )

        horizontal_line = DashedLine(
            LEFT * 5.5,
            RIGHT * 5.5,
            dash_length=0.18,
            color=WHITE,
        )

        vertical_line = DashedLine(
            DOWN * 3,
            UP * 3,
            dash_length=0.18,
            color=WHITE,
        )

        ns_label = Text(
            "Norte-Sur",
            font_size=22,
        ).move_to(
            RIGHT * 2.25 + UP * 2.3
        )

        ew_label = Text(
            "Este-Oeste",
            font_size=22,
        ).move_to(
            LEFT * 3.4 + UP * 1.45
        )

        first_step = data["steps"][0]

        ns_tracker = ValueTracker(first_step["north_south"])
        ew_tracker = ValueTracker(first_step["east_west"])
        light_tracker = ValueTracker(first_step["light"])
        step_tracker = ValueTracker(first_step["step"])
        reward_tracker = ValueTracker(first_step["reward"])
        total_tracker = ValueTracker(first_step["total_waiting"])

        ns_cars = always_redraw(
            lambda: self.create_north_south_cars(
                int(round(ns_tracker.get_value()))
            )
        )

        ew_cars = always_redraw(
            lambda: self.create_east_west_cars(
                int(round(ew_tracker.get_value()))
            )
        )

        ns_light = always_redraw(
            lambda: Circle(
                radius=0.20,
                color=WHITE,
                fill_color=(
                    GREEN
                    if int(round(light_tracker.get_value())) == 0
                    else RED
                ),
                fill_opacity=1,
            ).move_to(
                RIGHT * 1.35 + UP * 1.25
            )
        )

        ew_light = always_redraw(
            lambda: Circle(
                radius=0.20,
                color=WHITE,
                fill_color=(
                    GREEN
                    if int(round(light_tracker.get_value())) == 1
                    else RED
                ),
                fill_opacity=1,
            ).move_to(
                LEFT * 1.35 + DOWN * 1.25
            )
        )

        queue_labels = always_redraw(
            lambda: Text(
                "Cola N-S: "
                f"{int(round(ns_tracker.get_value()))}"
                "     "
                "Cola E-O: "
                f"{int(round(ew_tracker.get_value()))}",
                font_size=22,
            ).to_corner(UP + RIGHT).shift(DOWN * 0.75)
        )

        status = always_redraw(
            lambda: Text(
                f"Paso {int(round(step_tracker.get_value()))}  |  "
                f"Vehículos esperando: "
                f"{int(round(total_tracker.get_value()))}  |  "
                f"Recompensa: {reward_tracker.get_value():.1f}",
                font_size=21,
            ).to_edge(DOWN)
        )

        self.play(FadeIn(heading))
        self.play(
            FadeIn(horizontal_road),
            FadeIn(vertical_road),
            FadeIn(horizontal_line),
            FadeIn(vertical_line),
        )
        self.play(
            FadeIn(ns_label),
            FadeIn(ew_label),
            FadeIn(ns_cars),
            FadeIn(ew_cars),
            FadeIn(ns_light),
            FadeIn(ew_light),
            FadeIn(queue_labels),
            FadeIn(status),
        )

        for step in data["steps"][:35]:
            self.play(
                ns_tracker.animate.set_value(step["north_south"]),
                ew_tracker.animate.set_value(step["east_west"]),
                light_tracker.animate.set_value(step["light"]),
                step_tracker.animate.set_value(step["step"]),
                reward_tracker.animate.set_value(step["reward"]),
                total_tracker.animate.set_value(
                    step["total_waiting"]
                ),
                run_time=0.18,
            )

        metadata = data["metadata"]

        summary = Text(
            f"Cola promedio: {metadata['average_queue']:.2f}   |   "
            f"Recompensa total: {metadata['total_reward']:.2f}",
            font_size=24,
            color=accent_color,
        ).to_edge(DOWN)

        self.play(
            FadeOut(status),
            FadeIn(summary),
        )
        self.wait(2)

    def show_comparison(
        self,
        random_data: dict[str, Any],
        trained_data: dict[str, Any],
    ) -> None:
        title = Text(
            "Comparación de resultados",
            font_size=38,
        ).to_edge(UP)

        random_average = random_data["metadata"]["average_queue"]
        trained_average = trained_data["metadata"]["average_queue"]

        random_reward = random_data["metadata"]["total_reward"]
        trained_reward = trained_data["metadata"]["total_reward"]

        random_text = Text(
            "Agente aleatorio\n"
            f"Cola promedio: {random_average:.2f}\n"
            f"Recompensa total: {random_reward:.2f}",
            font_size=27,
            color=BLUE,
            line_spacing=1.2,
        ).move_to(LEFT * 3)

        trained_text = Text(
            "Agente DQN entrenado\n"
            f"Cola promedio: {trained_average:.2f}\n"
            f"Recompensa total: {trained_reward:.2f}",
            font_size=27,
            color=GREEN,
            line_spacing=1.2,
        ).move_to(RIGHT * 3)

        if trained_average < random_average:
            conclusion_message = (
                "El agente entrenado mantiene menos vehículos esperando."
            )
        else:
            conclusion_message = (
                "El entrenamiento debe ampliarse o ajustarse para mejorar."
            )

        conclusion = Text(
            conclusion_message,
            font_size=27,
            color=YELLOW,
        ).to_edge(DOWN)

        self.play(FadeIn(title))
        self.play(
            FadeIn(random_text),
            FadeIn(trained_text),
        )
        self.play(FadeIn(conclusion))
        self.wait(4)
