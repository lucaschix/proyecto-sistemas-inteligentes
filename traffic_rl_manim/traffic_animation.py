from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from manim import (
    AnimationGroup,
    Arrow,
    Circle,
    Create,
    DOWN,
    FadeIn,
    FadeOut,
    GREEN,
    GrowArrow,
    Indicate,
    LEFT,
    Line,
    Rectangle,
    ReplacementTransform,
    RIGHT,
    RoundedRectangle,
    Scene,
    Text,
    Transform,
    UP,
    VGroup,
    WHITE,
    Write,
)

BASE_DIR = Path(__file__).resolve().parent
TRAJECTORY_DIR = BASE_DIR / "outputs" / "trajectories"

BG = "#F5F6FA"
INK = "#1E293B"
MUTED = "#64748B"
PURPLE = "#6C5CE7"
PURPLE_SOFT = "#EDE7FF"
BLUE = "#3D8BFF"
BLUE_SOFT = "#EAF2FF"
GREEN_MAIN = "#20A66A"
GREEN_SOFT = "#E8F8F0"
AMBER = "#E39A16"
AMBER_SOFT = "#FFF4D6"
RED = "#E24A4A"
ROAD = "#334155"
ROAD_LINE = "#CBD5E1"
PANEL = "#FFFFFF"
BORDER = "#CBD5E1"


class TrafficLearningScene(Scene):
    """Video educativo que compara un agente aleatorio con un DQN."""

    def construct(self) -> None:
        self.camera.background_color = BG
        random_data = self.load_json("random_trajectory.json")
        trained_data = self.load_json("trained_trajectory.json")
        summary = self.load_json("evaluation_summary.json", required=False)

        self.show_problem()
        self.clear_scene()
        self.show_dqn(trained_data)
        self.clear_scene()
        self.show_side_by_side(random_data, trained_data)
        self.clear_scene()
        self.show_comparison(random_data, trained_data, summary)

    def load_json(self, filename: str, required: bool = True) -> dict[str, Any] | None:
        path = TRAJECTORY_DIR / filename
        if not path.exists():
            if required:
                raise FileNotFoundError(
                    f"No se encontró {path}. Ejecuta primero export_trajectories.py."
                )
            return None
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def clear_scene(self) -> None:
        if self.mobjects:
            self.play(*[FadeOut(item) for item in list(self.mobjects)], run_time=0.45)

    def show_problem(self) -> None:
        eyebrow = Text("APRENDIZAJE POR REFUERZO APLICADO", font_size=18, color=PURPLE, weight="BOLD")
        title = Text("¿Puede un semáforo aprender a reducir la congestión?", font_size=38, color=INK, weight="BOLD")
        subtitle = Text(
            "El agente observa las colas, elige una luz verde y recibe una recompensa.",
            font_size=22,
            color=MUTED,
        )
        heading = VGroup(eyebrow, title, subtitle).arrange(DOWN, buff=0.13).to_edge(UP, buff=0.3)
        self.play(FadeIn(eyebrow), Write(title), FadeIn(subtitle, shift=UP * 0.1))

        intersection = self.make_intersection(center=UP * 0.1, scale=1.18)
        self.play(FadeIn(intersection, shift=UP * 0.1))

        cycle = VGroup(
            self.pill("ESTADO", "colas + luz", BLUE, BLUE_SOFT),
            self.pill("ACCIÓN", "verde N-S / E-O", PURPLE, PURPLE_SOFT),
            self.pill("RECOMPENSA", "menos espera", GREEN_MAIN, GREEN_SOFT),
            self.pill("APRENDIZAJE", "mejor política", AMBER, AMBER_SOFT),
        ).arrange(RIGHT, buff=0.22).scale(0.84).to_edge(DOWN, buff=0.45)
        arrows = VGroup(
            *[
                Arrow(cycle[i].get_right(), cycle[i + 1].get_left(), buff=0.06, color=MUTED, stroke_width=3)
                for i in range(3)
            ]
        )
        self.play(FadeIn(cycle[0]))
        for index in range(1, len(cycle)):
            self.play(GrowArrow(arrows[index - 1]), FadeIn(cycle[index]), run_time=0.45)
        self.wait(1.3)

    def show_dqn(self, trained_data: dict[str, Any]) -> None:
        title = Text("La red DQN estima el valor de cada acción", font_size=36, color=INK, weight="BOLD")
        subtitle = Text(
            "La acción con mayor valor Q es la decisión preferida por el agente entrenado.",
            font_size=21,
            color=MUTED,
        )
        VGroup(title, subtitle).arrange(DOWN, buff=0.12).to_edge(UP, buff=0.3)
        self.play(Write(title), FadeIn(subtitle, shift=UP * 0.1))

        input_labels = ["Cola N-S", "Cola E-O", "Luz actual"]
        inputs = VGroup(*[self.network_node(label, BLUE, BLUE_SOFT) for label in input_labels]).arrange(DOWN, buff=0.35)
        inputs.move_to(LEFT * 4.4 + DOWN * 0.05)
        hidden_left = VGroup(*[Circle(radius=0.18, color=PURPLE, fill_color=PURPLE_SOFT, fill_opacity=1) for _ in range(5)]).arrange(DOWN, buff=0.27)
        hidden_right = VGroup(*[Circle(radius=0.18, color=PURPLE, fill_color=PURPLE_SOFT, fill_opacity=1) for _ in range(4)]).arrange(DOWN, buff=0.35)
        hidden_left.move_to(LEFT * 1.3 + DOWN * 0.05)
        hidden_right.move_to(RIGHT * 1.15 + DOWN * 0.05)

        sample = next((step for step in trained_data["steps"] if step.get("q_values")), trained_data["steps"][0])
        q_values = sample.get("q_values") or [0.0, 0.0]
        outputs = VGroup(
            self.q_output("Q(verde N-S)", float(q_values[0]), GREEN_MAIN if q_values[0] >= q_values[1] else BORDER),
            self.q_output("Q(verde E-O)", float(q_values[1]), GREEN_MAIN if q_values[1] > q_values[0] else BORDER),
        ).arrange(DOWN, buff=0.5).move_to(RIGHT * 4.45 + DOWN * 0.05)

        connections = VGroup()
        for source in inputs:
            for target in hidden_left:
                connections.add(Line(source.get_right(), target.get_left(), color=BORDER, stroke_opacity=0.6))
        for source in hidden_left:
            for target in hidden_right:
                connections.add(Line(source.get_right(), target.get_left(), color=BORDER, stroke_opacity=0.55))
        for source in hidden_right:
            for target in outputs:
                connections.add(Line(source.get_right(), target.get_left(), color=BORDER, stroke_opacity=0.6))

        self.play(Create(connections), run_time=1.0)
        self.play(FadeIn(inputs), FadeIn(hidden_left), FadeIn(hidden_right), FadeIn(outputs))
        chosen = outputs[0] if q_values[0] >= q_values[1] else outputs[1]
        self.play(Indicate(chosen, color=GREEN_MAIN, scale_factor=1.05))

        explore = self.pill("EXPLORACIÓN", "probar acciones", AMBER, AMBER_SOFT)
        exploit = self.pill("EXPLOTACIÓN", "usar la mejor Q", GREEN_MAIN, GREEN_SOFT)
        footer = VGroup(explore, Arrow(explore.get_right(), exploit.get_left(), buff=0.08, color=MUTED), exploit)
        footer.arrange(RIGHT, buff=0.25).to_edge(DOWN, buff=0.45)
        self.play(FadeIn(footer, shift=UP * 0.1))
        self.wait(1.5)

    def show_side_by_side(self, random_data: dict[str, Any], trained_data: dict[str, Any]) -> None:
        title = Text("Misma demanda, dos políticas distintas", font_size=36, color=INK, weight="BOLD")
        subtitle = Text(
            "El agente aleatorio cambia sin estrategia; el DQN usa los valores aprendidos.",
            font_size=21,
            color=MUTED,
        )
        VGroup(title, subtitle).arrange(DOWN, buff=0.12).to_edge(UP, buff=0.25)
        self.play(Write(title), FadeIn(subtitle, shift=UP * 0.1))

        random_panel = self.make_panel("AGENTE ALEATORIO", LEFT * 3.55 + DOWN * 0.2, BLUE)
        trained_panel = self.make_panel("AGENTE DQN", RIGHT * 3.55 + DOWN * 0.2, GREEN_MAIN)
        self.play(FadeIn(random_panel["static"]), FadeIn(trained_panel["static"]))

        indices = self.sample_indices(random_data["steps"], trained_data["steps"], count=18)
        random_queue = self.make_queue_group(random_data["steps"][indices[0]], random_panel["center"], BLUE)
        trained_queue = self.make_queue_group(trained_data["steps"][indices[0]], trained_panel["center"], GREEN_MAIN)
        random_status = self.make_status(random_data["steps"][indices[0]], "acción aleatoria", random_panel["center"])
        trained_status = self.make_status(trained_data["steps"][indices[0]], self.q_text(trained_data["steps"][indices[0]]), trained_panel["center"])
        self.play(FadeIn(random_queue), FadeIn(trained_queue), FadeIn(random_status), FadeIn(trained_status))

        for index in indices[1:]:
            random_step = random_data["steps"][index]
            trained_step = trained_data["steps"][index]
            new_random_queue = self.make_queue_group(random_step, random_panel["center"], BLUE)
            new_trained_queue = self.make_queue_group(trained_step, trained_panel["center"], GREEN_MAIN)
            new_random_status = self.make_status(random_step, "acción aleatoria", random_panel["center"])
            new_trained_status = self.make_status(trained_step, self.q_text(trained_step), trained_panel["center"])

            animations = [
                Transform(random_queue, new_random_queue),
                Transform(trained_queue, new_trained_queue),
                Transform(random_status, new_random_status),
                Transform(trained_status, new_trained_status),
                random_panel["ns_light"].animate.set_fill(
                    GREEN_MAIN if int(random_step["light"]) == 0 else RED,
                    opacity=1,
                ),
                random_panel["ew_light"].animate.set_fill(
                    GREEN_MAIN if int(random_step["light"]) == 1 else RED,
                    opacity=1,
                ),
                trained_panel["ns_light"].animate.set_fill(
                    GREEN_MAIN if int(trained_step["light"]) == 0 else RED,
                    opacity=1,
                ),
                trained_panel["ew_light"].animate.set_fill(
                    GREEN_MAIN if int(trained_step["light"]) == 1 else RED,
                    opacity=1,
                ),
            ]
            moving = []
            if random_step.get("vehicles_served", 0) > 0:
                moving.append(self.moving_car(random_panel["center"], int(random_step["light"]), BLUE))
            if trained_step.get("vehicles_served", 0) > 0:
                moving.append(self.moving_car(trained_panel["center"], int(trained_step["light"]), GREEN_MAIN))
            self.play(*animations, *moving, run_time=0.33)

        self.wait(1.0)

    def show_comparison(
        self,
        random_data: dict[str, Any],
        trained_data: dict[str, Any],
        summary: dict[str, Any] | None,
    ) -> None:
        title = Text("Resultado medido en múltiples episodios", font_size=36, color=INK, weight="BOLD")
        subtitle = Text(
            "Las cifras se leen desde los JSON generados; no están escritas manualmente en el video.",
            font_size=20,
            color=MUTED,
        )
        VGroup(title, subtitle).arrange(DOWN, buff=0.12).to_edge(UP, buff=0.28)
        self.play(Write(title), FadeIn(subtitle, shift=UP * 0.1))

        random_metrics = (summary or {}).get("random", random_data["metadata"])
        trained_metrics = (summary or {}).get("trained", trained_data["metadata"])

        cards = VGroup(
            self.metric_card(
                "COLA PROMEDIO",
                random_metrics.get("average_queue", 0.0),
                trained_metrics.get("average_queue", 0.0),
                lower_is_better=True,
                suffix=" vehículos",
            ),
            self.metric_card(
                "RECOMPENSA TOTAL",
                random_metrics.get("total_reward", 0.0),
                trained_metrics.get("total_reward", 0.0),
                lower_is_better=False,
                suffix="",
            ),
            self.metric_card(
                "CAMBIOS DE LUZ",
                random_metrics.get("switches", 0.0),
                trained_metrics.get("switches", 0.0),
                lower_is_better=True,
                suffix="",
            ),
        ).arrange(RIGHT, buff=0.35).scale(0.92).move_to(DOWN * 0.2)

        self.play(AnimationGroup(*[FadeIn(card, shift=UP * 0.15) for card in cards], lag_ratio=0.2))

        random_queue = float(random_metrics.get("average_queue", 0.0))
        trained_queue = float(trained_metrics.get("average_queue", 0.0))
        if random_queue > 0 and trained_queue < random_queue:
            reduction = (random_queue - trained_queue) / random_queue * 100.0
            conclusion_text = f"El DQN reduce la cola promedio en {reduction:.1f}%"
            conclusion_color = GREEN_MAIN
        else:
            conclusion_text = "El modelo necesita más entrenamiento o una recompensa mejor diseñada"
            conclusion_color = AMBER

        conclusion = RoundedRectangle(
            width=10.3,
            height=0.85,
            corner_radius=0.18,
            color=conclusion_color,
            fill_color=GREEN_SOFT if conclusion_color == GREEN_MAIN else AMBER_SOFT,
            fill_opacity=1,
            stroke_width=2.5,
        )
        conclusion_text_obj = Text(conclusion_text, font_size=24, color=INK, weight="BOLD").move_to(conclusion)
        conclusion_group = VGroup(conclusion, conclusion_text_obj).to_edge(DOWN, buff=0.45)
        self.play(FadeIn(conclusion_group, shift=UP * 0.15))
        self.wait(2.5)

    @staticmethod
    def pill(label: str, value: str, stroke: str, fill: str) -> VGroup:
        box = RoundedRectangle(
            width=2.75,
            height=0.85,
            corner_radius=0.18,
            color=stroke,
            fill_color=fill,
            fill_opacity=1,
            stroke_width=2.2,
        )
        label_text = Text(label, font_size=14, color=stroke, weight="BOLD")
        value_text = Text(value, font_size=18, color=INK)
        return VGroup(box, VGroup(label_text, value_text).arrange(DOWN, buff=0.05).move_to(box))

    @staticmethod
    def network_node(label: str, stroke: str, fill: str) -> VGroup:
        circle = Circle(radius=0.35, color=stroke, fill_color=fill, fill_opacity=1, stroke_width=2.5)
        text = Text(label, font_size=17, color=INK).next_to(circle, LEFT, buff=0.18)
        return VGroup(circle, text)

    @staticmethod
    def q_output(label: str, value: float, stroke: str) -> VGroup:
        box = RoundedRectangle(
            width=3.0,
            height=0.9,
            corner_radius=0.16,
            color=stroke,
            fill_color=GREEN_SOFT if stroke == GREEN_MAIN else WHITE,
            fill_opacity=1,
            stroke_width=2.5,
        )
        text = Text(f"{label} = {value:.2f}", font_size=19, color=INK, weight="BOLD").move_to(box)
        return VGroup(box, text)

    @staticmethod
    def make_intersection(center, scale: float = 1.0) -> VGroup:
        horizontal = Rectangle(width=7.8, height=1.6, color=ROAD, fill_color=ROAD, fill_opacity=1)
        vertical = Rectangle(width=1.6, height=4.0, color=ROAD, fill_color=ROAD, fill_opacity=1)
        h_line = Line(LEFT * 3.8, RIGHT * 3.8, color=ROAD_LINE, stroke_width=2)
        v_line = Line(DOWN * 1.9, UP * 1.9, color=ROAD_LINE, stroke_width=2)
        ns_cars = VGroup(*[
            RoundedRectangle(width=0.3, height=0.55, corner_radius=0.05, color=PURPLE, fill_color=PURPLE, fill_opacity=1).move_to(DOWN * (1.15 + i * 0.62) + RIGHT * 0.36)
            for i in range(3)
        ])
        ew_cars = VGroup(*[
            RoundedRectangle(width=0.55, height=0.3, corner_radius=0.05, color=BLUE, fill_color=BLUE, fill_opacity=1).move_to(LEFT * (1.2 + i * 0.65) + UP * 0.36)
            for i in range(4)
        ])
        lights = VGroup(
            Circle(radius=0.16, color=WHITE, fill_color=GREEN_MAIN, fill_opacity=1).move_to(RIGHT * 1.0 + DOWN * 1.0),
            Circle(radius=0.16, color=WHITE, fill_color=RED, fill_opacity=1).move_to(LEFT * 1.0 + UP * 1.0),
        )
        group = VGroup(horizontal, vertical, h_line, v_line, ns_cars, ew_cars, lights)
        group.scale(scale).move_to(center)
        return group

    def make_panel(self, label: str, center, accent: str) -> dict[str, Any]:
        panel = RoundedRectangle(
            width=6.45,
            height=4.85,
            corner_radius=0.18,
            color=BORDER,
            fill_color=PANEL,
            fill_opacity=1,
            stroke_width=2,
        ).move_to(center)
        heading = Text(label, font_size=21, color=accent, weight="BOLD").next_to(panel.get_top(), DOWN, buff=0.28)

        horizontal = Rectangle(width=5.25, height=1.05, color=ROAD, fill_color=ROAD, fill_opacity=1).move_to(center + UP * 0.15)
        vertical = Rectangle(width=1.05, height=2.8, color=ROAD, fill_color=ROAD, fill_opacity=1).move_to(center + UP * 0.15)
        h_line = Line(center + LEFT * 2.55 + UP * 0.15, center + RIGHT * 2.55 + UP * 0.15, color=ROAD_LINE, stroke_width=1.5)
        v_line = Line(center + DOWN * 1.2, center + UP * 1.5, color=ROAD_LINE, stroke_width=1.5)
        ns_light = Circle(radius=0.12, color=WHITE, fill_color=GREEN_MAIN, fill_opacity=1).move_to(center + RIGHT * 0.72 + DOWN * 0.72)
        ew_light = Circle(radius=0.12, color=WHITE, fill_color=RED, fill_opacity=1).move_to(center + LEFT * 0.72 + UP * 0.72)
        static = VGroup(panel, heading, horizontal, vertical, h_line, v_line, ns_light, ew_light)
        return {
            "static": static,
            "center": center,
            "ns_light": ns_light,
            "ew_light": ew_light,
        }

    @staticmethod
    def make_queue_group(step: dict[str, Any], center, accent: str) -> VGroup:
        ns_count = max(0, int(round(float(step["north_south"]))))
        ew_count = max(0, int(round(float(step["east_west"]))))
        cars = VGroup()
        for index in range(min(ns_count, 6)):
            cars.add(
                RoundedRectangle(
                    width=0.22,
                    height=0.4,
                    corner_radius=0.04,
                    color=accent,
                    fill_color=accent,
                    fill_opacity=1,
                ).move_to(center + RIGHT * 0.24 + DOWN * (0.8 + index * 0.39))
            )
        for index in range(min(ew_count, 8)):
            cars.add(
                RoundedRectangle(
                    width=0.4,
                    height=0.22,
                    corner_radius=0.04,
                    color=accent,
                    fill_color=accent,
                    fill_opacity=1,
                ).move_to(center + LEFT * (0.82 + index * 0.42) + UP * 0.24)
            )
        labels = VGroup(
            Text(f"N-S: {ns_count}", font_size=16, color=INK, weight="BOLD"),
            Text(f"E-O: {ew_count}", font_size=16, color=INK, weight="BOLD"),
        ).arrange(RIGHT, buff=0.45).move_to(center + UP * 1.65)
        return VGroup(cars, labels)

    @staticmethod
    def make_status(step: dict[str, Any], detail: str, center) -> VGroup:
        box = RoundedRectangle(
            width=5.65,
            height=0.72,
            corner_radius=0.14,
            color=BORDER,
            fill_color=WHITE,
            fill_opacity=1,
            stroke_width=1.6,
        ).move_to(center + DOWN * 1.82)
        status = Text(
            f"Paso {int(step['step'])} · espera {int(round(step['total_waiting']))} · r {float(step['reward']):.1f}",
            font_size=15,
            color=INK,
            weight="BOLD",
        )
        decision = Text(detail, font_size=13, color=MUTED)
        content = VGroup(status, decision).arrange(DOWN, buff=0.04).move_to(box)
        return VGroup(box, content)

    @staticmethod
    def q_text(step: dict[str, Any]) -> str:
        q_values = step.get("q_values")
        if not q_values:
            return "acción según la política aprendida"
        return f"Q(NS) {float(q_values[0]):.1f} · Q(EO) {float(q_values[1]):.1f}"

    @staticmethod
    def moving_car(center, light: int, color: str):
        if light == 0:
            car = RoundedRectangle(width=0.22, height=0.4, corner_radius=0.04, color=color, fill_color=color, fill_opacity=1)
            car.move_to(center + DOWN * 0.85 + RIGHT * 0.24)
            return car.animate.move_to(center + UP * 1.25 + RIGHT * 0.24).set_opacity(0)
        car = RoundedRectangle(width=0.4, height=0.22, corner_radius=0.04, color=color, fill_color=color, fill_opacity=1)
        car.move_to(center + LEFT * 0.9 + UP * 0.24)
        return car.animate.move_to(center + RIGHT * 2.1 + UP * 0.24).set_opacity(0)

    @staticmethod
    def sample_indices(random_steps: list[dict[str, Any]], trained_steps: list[dict[str, Any]], count: int) -> list[int]:
        usable = min(len(random_steps), len(trained_steps))
        if usable <= count:
            return list(range(usable))
        return [round(index * (usable - 1) / (count - 1)) for index in range(count)]

    @staticmethod
    def metric_card(
        label: str,
        random_value: float,
        trained_value: float,
        lower_is_better: bool,
        suffix: str,
    ) -> VGroup:
        card = RoundedRectangle(
            width=4.05,
            height=3.1,
            corner_radius=0.2,
            color=BORDER,
            fill_color=WHITE,
            fill_opacity=1,
            stroke_width=2,
        )
        heading = Text(label, font_size=17, color=MUTED, weight="BOLD")
        random_label = Text("Aleatorio", font_size=16, color=BLUE, weight="BOLD")
        random_number = Text(f"{float(random_value):.1f}{suffix}", font_size=25, color=INK, weight="BOLD")
        trained_label = Text("DQN", font_size=16, color=GREEN_MAIN, weight="BOLD")
        trained_number = Text(f"{float(trained_value):.1f}{suffix}", font_size=25, color=INK, weight="BOLD")
        better = trained_value < random_value if lower_is_better else trained_value > random_value
        badge_text = "MEJORA" if better else "REVISAR"
        badge_color = GREEN_MAIN if better else AMBER
        badge_fill = GREEN_SOFT if better else AMBER_SOFT
        badge = RoundedRectangle(
            width=1.45,
            height=0.42,
            corner_radius=0.12,
            color=badge_color,
            fill_color=badge_fill,
            fill_opacity=1,
            stroke_width=1.5,
        )
        badge_label = Text(badge_text, font_size=13, color=badge_color, weight="BOLD").move_to(badge)
        content = VGroup(
            heading,
            VGroup(random_label, random_number).arrange(DOWN, buff=0.04),
            VGroup(trained_label, trained_number).arrange(DOWN, buff=0.04),
            VGroup(badge, badge_label),
        ).arrange(DOWN, buff=0.18).move_to(card)
        return VGroup(card, content)
