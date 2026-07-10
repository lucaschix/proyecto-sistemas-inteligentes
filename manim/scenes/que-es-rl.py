from __future__ import annotations

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
    ORIGIN,
    RIGHT,
    RoundedRectangle,
    Scene,
    Text,
    UP,
    VGroup,
    WHITE,
    Write,
)

# Paleta alineada con el sitio principal.
BG = "#F3F5F4"
INK = "#172320"
MUTED = "#54645F"
GREEN_DARK = "#0F5447"
GREEN_MAIN = "#176B5B"
GREEN_SOFT = "#E2F3EE"
AMBER = "#B66A08"
AMBER_SOFT = "#FFF4D6"
BLUE = "#2F6FED"
BLUE_SOFT = "#EAF1FF"
BORDER = "#8FA39C"


class QueEsRLCycle(Scene):
    """Explicación breve y visual del ciclo agente-entorno.

    Conserva el nombre de escena anterior para que el flujo de renderizado no
    requiera cambios adicionales.
    """

    def construct(self) -> None:
        self.camera.background_color = BG
        self.show_title()
        agent = self.make_entity("AGENTE", "Aprende una política", GREEN_MAIN, GREEN_SOFT)
        environment = self.make_entity("ENTORNO", "Responde a cada decisión", BORDER, WHITE)
        agent.move_to(LEFT * 3.55 + UP * 0.25)
        environment.move_to(RIGHT * 3.55 + UP * 0.25)

        self.play(FadeIn(agent, shift=RIGHT * 0.2), FadeIn(environment, shift=LEFT * 0.2))

        state_card = self.make_signal_card(
            "1 · ESTADO",
            "Riesgo alto",
            BLUE,
            BLUE_SOFT,
        ).move_to(UP * 1.75)
        action_card = self.make_signal_card(
            "2 · ACCIÓN",
            "Bloquear",
            GREEN_MAIN,
            GREEN_SOFT,
        ).move_to(DOWN * 0.75)
        feedback_card = self.make_feedback_card().move_to(DOWN * 2.25)

        state_arrow = Arrow(
            environment.get_left() + UP * 0.35,
            agent.get_right() + UP * 0.35,
            color=BLUE,
            buff=0.18,
            stroke_width=5,
        )
        action_arrow = Arrow(
            agent.get_right() + DOWN * 0.35,
            environment.get_left() + DOWN * 0.35,
            color=GREEN_MAIN,
            buff=0.18,
            stroke_width=5,
        )

        self.play(GrowArrow(state_arrow), FadeIn(state_card, shift=DOWN * 0.15))
        self.play(Indicate(agent[0], color=BLUE, scale_factor=1.03), run_time=0.7)
        self.play(GrowArrow(action_arrow), FadeIn(action_card, shift=UP * 0.15))
        self.play(Indicate(environment[0], color=GREEN_MAIN, scale_factor=1.03), run_time=0.7)
        self.play(FadeIn(feedback_card, shift=UP * 0.2))

        update = self.make_update_card().to_edge(DOWN, buff=0.35)
        self.play(FadeOut(feedback_card, shift=DOWN * 0.15), FadeIn(update, shift=UP * 0.15))

        loop = Circle(radius=2.95, color=AMBER, stroke_width=3).set_stroke(opacity=0.45)
        loop.move_to(UP * 0.05)
        loop_label = Text(
            "El ciclo se repite: probar → observar → mejorar",
            font_size=23,
            color=MUTED,
        ).next_to(loop, DOWN, buff=0.1)

        self.play(Create(loop), Write(loop_label), run_time=1.2)
        self.play(
            AnimationGroup(
                Indicate(state_card, color=BLUE, scale_factor=1.05),
                Indicate(action_card, color=GREEN_MAIN, scale_factor=1.05),
                Indicate(update, color=AMBER, scale_factor=1.03),
                lag_ratio=0.25,
            )
        )
        self.wait(1.8)

    def show_title(self) -> None:
        eyebrow = Text(
            "APRENDIZAJE POR REFUERZO",
            font_size=18,
            color=GREEN_MAIN,
            weight="BOLD",
        )
        title = Text("El agente aprende de las consecuencias", font_size=39, color=INK, weight="BOLD")
        subtitle = Text(
            "No memoriza una respuesta: mejora una política al repetir el ciclo.",
            font_size=22,
            color=MUTED,
        )
        heading = VGroup(eyebrow, title, subtitle).arrange(DOWN, buff=0.12)
        heading.to_edge(UP, buff=0.25)
        self.play(FadeIn(eyebrow), Write(title), FadeIn(subtitle, shift=UP * 0.1))

    @staticmethod
    def make_entity(title: str, subtitle: str, stroke: str, fill: str) -> VGroup:
        box = RoundedRectangle(
            width=3.15,
            height=1.45,
            corner_radius=0.18,
            color=stroke,
            fill_color=fill,
            fill_opacity=1,
            stroke_width=3,
        )
        heading = Text(title, font_size=27, color=INK, weight="BOLD")
        detail = Text(subtitle, font_size=17, color=MUTED)
        content = VGroup(heading, detail).arrange(DOWN, buff=0.12).move_to(box)
        return VGroup(box, content)

    @staticmethod
    def make_signal_card(label: str, value: str, stroke: str, fill: str) -> VGroup:
        card = RoundedRectangle(
            width=2.65,
            height=0.92,
            corner_radius=0.16,
            color=stroke,
            fill_color=fill,
            fill_opacity=1,
            stroke_width=2.5,
        )
        label_text = Text(label, font_size=16, color=stroke, weight="BOLD")
        value_text = Text(value, font_size=24, color=INK, weight="BOLD")
        content = VGroup(label_text, value_text).arrange(DOWN, buff=0.08).move_to(card)
        return VGroup(card, content)

    @staticmethod
    def make_feedback_card() -> VGroup:
        card = RoundedRectangle(
            width=6.4,
            height=1.0,
            corner_radius=0.18,
            color=AMBER,
            fill_color=AMBER_SOFT,
            fill_opacity=1,
            stroke_width=2.5,
        )
        reward = Text("3 · RECOMPENSA  +8", font_size=20, color=GREEN_DARK, weight="BOLD")
        next_state = Text("4 · SIGUIENTE ESTADO  Riesgo medio", font_size=20, color=INK, weight="BOLD")
        divider = Text("+", font_size=23, color=AMBER, weight="BOLD")
        content = VGroup(reward, divider, next_state).arrange(RIGHT, buff=0.25).move_to(card)
        return VGroup(card, content)

    @staticmethod
    def make_update_card() -> VGroup:
        card = RoundedRectangle(
            width=7.6,
            height=0.75,
            corner_radius=0.15,
            color=AMBER,
            fill_color=WHITE,
            fill_opacity=1,
            stroke_width=2.5,
        )
        dot = Circle(radius=0.08, color=GREEN, fill_color=GREEN, fill_opacity=1)
        text = Text(
            "La transición actualiza Q(riesgo alto, bloquear)",
            font_size=22,
            color=INK,
            weight="BOLD",
        )
        content = VGroup(dot, text).arrange(RIGHT, buff=0.2).move_to(card)
        return VGroup(card, content)
