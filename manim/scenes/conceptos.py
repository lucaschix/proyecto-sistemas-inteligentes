from __future__ import annotations

from manim import (
    Arrow,
    DOWN,
    FadeIn,
    FadeOut,
    GrowArrow,
    Indicate,
    LEFT,
    Rectangle,
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

BG = "#F3F5F4"
INK = "#172320"
MUTED = "#54645F"
GREEN = "#176B5B"
GREEN_DARK = "#0F5447"
GREEN_SOFT = "#E2F3EE"
BLUE = "#2F6FED"
BLUE_SOFT = "#EAF1FF"
AMBER = "#B66A08"
AMBER_SOFT = "#FFF4D6"
RED = "#B42318"
RED_SOFT = "#FEECEB"
BORDER = "#8FA39C"


class ConceptosTransicion(Scene):
    """Explica qué información contiene una transición y cómo actualiza Q."""

    def construct(self) -> None:
        self.camera.background_color = BG
        self.show_heading()

        cards = VGroup(
            self.transition_card("sₜ · ESTADO", "Riesgo alto", BLUE, BLUE_SOFT),
            self.transition_card("aₜ · ACCIÓN", "Bloquear", GREEN, GREEN_SOFT),
            self.transition_card("rₜ₊₁ · RECOMPENSA", "+8", AMBER, AMBER_SOFT),
            self.transition_card("sₜ₊₁ · SIGUIENTE", "Riesgo medio", BORDER, WHITE),
        ).arrange(RIGHT, buff=0.28)
        cards.scale(0.88).move_to(UP * 0.75)

        arrows = VGroup(
            *[
                Arrow(
                    cards[index].get_right(),
                    cards[index + 1].get_left(),
                    buff=0.08,
                    color=MUTED,
                    stroke_width=3,
                    max_tip_length_to_length_ratio=0.22,
                )
                for index in range(3)
            ]
        )

        self.play(FadeIn(cards[0], shift=UP * 0.15))
        for index in range(1, len(cards)):
            self.play(GrowArrow(arrows[index - 1]), FadeIn(cards[index], shift=UP * 0.15), run_time=0.65)

        tuple_card = self.make_tuple_card().next_to(cards, DOWN, buff=0.65)
        self.play(FadeIn(tuple_card, shift=UP * 0.15))

        target = self.make_target_breakdown().next_to(tuple_card, DOWN, buff=0.45)
        self.play(FadeIn(target[0], shift=UP * 0.12))
        self.play(FadeIn(target[1], shift=UP * 0.12))
        self.play(FadeIn(target[2], shift=UP * 0.12))

        formula = self.make_formula().to_edge(DOWN, buff=0.32)
        self.play(FadeIn(formula, shift=UP * 0.15))
        self.play(Indicate(formula[1], color=AMBER, scale_factor=1.02))

        old_value = Text("Q = 2.0", font_size=24, color=MUTED, weight="BOLD")
        new_value = Text("Q = 4.6", font_size=24, color=GREEN_DARK, weight="BOLD")
        old_value.next_to(formula, RIGHT, buff=0.35)
        new_value.move_to(old_value)
        self.play(FadeIn(old_value))
        self.play(Transform(old_value, new_value), run_time=0.9)

        closing = Text(
            "Una experiencia conecta la decisión presente con su efecto futuro.",
            font_size=22,
            color=MUTED,
        ).to_edge(DOWN, buff=0.08)
        self.play(FadeOut(target, shift=DOWN * 0.1), FadeIn(closing, shift=UP * 0.1))
        self.wait(2)

    def show_heading(self) -> None:
        eyebrow = Text("CONCEPTOS FUNDAMENTALES", font_size=18, color=GREEN, weight="BOLD")
        title = Text("Una transición RL contiene cuatro piezas", font_size=38, color=INK, weight="BOLD")
        subtitle = Text(
            "Q-learning usa la transición completa, no una etiqueta aislada.",
            font_size=22,
            color=MUTED,
        )
        heading = VGroup(eyebrow, title, subtitle).arrange(DOWN, buff=0.12).to_edge(UP, buff=0.25)
        self.play(FadeIn(eyebrow), Write(title), FadeIn(subtitle, shift=UP * 0.1))

    @staticmethod
    def transition_card(label: str, value: str, stroke: str, fill: str) -> VGroup:
        card = RoundedRectangle(
            width=2.85,
            height=1.5,
            corner_radius=0.16,
            color=stroke,
            fill_color=fill,
            fill_opacity=1,
            stroke_width=2.5,
        )
        label_text = Text(label, font_size=16, color=stroke, weight="BOLD")
        value_text = Text(value, font_size=24, color=INK, weight="BOLD")
        content = VGroup(label_text, value_text).arrange(DOWN, buff=0.16).move_to(card)
        return VGroup(card, content)

    @staticmethod
    def make_tuple_card() -> VGroup:
        card = RoundedRectangle(
            width=8.7,
            height=0.78,
            corner_radius=0.16,
            color=GREEN,
            fill_color=WHITE,
            fill_opacity=1,
            stroke_width=2.5,
        )
        label = Text("EXPERIENCIA", font_size=16, color=GREEN, weight="BOLD")
        value = Text("(riesgo alto, bloquear, +8, riesgo medio)", font_size=23, color=INK)
        content = VGroup(label, value).arrange(RIGHT, buff=0.3).move_to(card)
        return VGroup(card, content)

    @staticmethod
    def make_target_breakdown() -> VGroup:
        immediate = RoundedRectangle(
            width=3.2,
            height=0.72,
            corner_radius=0.14,
            color=AMBER,
            fill_color=AMBER_SOFT,
            fill_opacity=1,
            stroke_width=2,
        )
        immediate_text = Text("Recompensa inmediata: +8", font_size=19, color=INK).move_to(immediate)

        future = RoundedRectangle(
            width=3.55,
            height=0.72,
            corner_radius=0.14,
            color=BLUE,
            fill_color=BLUE_SOFT,
            fill_opacity=1,
            stroke_width=2,
        )
        future_text = Text("Mejor valor futuro: max Q(s', a')", font_size=18, color=INK).move_to(future)

        target = RoundedRectangle(
            width=3.2,
            height=0.72,
            corner_radius=0.14,
            color=GREEN,
            fill_color=GREEN_SOFT,
            fill_opacity=1,
            stroke_width=2,
        )
        target_text = Text("Objetivo: r + γ · futuro", font_size=19, color=INK).move_to(target)

        return VGroup(
            VGroup(immediate, immediate_text),
            VGroup(future, future_text),
            VGroup(target, target_text),
        ).arrange(RIGHT, buff=0.3)

    @staticmethod
    def make_formula() -> VGroup:
        card = RoundedRectangle(
            width=9.8,
            height=0.88,
            corner_radius=0.16,
            color=BORDER,
            fill_color=WHITE,
            fill_opacity=1,
            stroke_width=2,
        )
        label = Text("ACTUALIZACIÓN", font_size=15, color=GREEN, weight="BOLD")
        formula = Text(
            "Q(s,a) ← Q(s,a) + α [ r + γ max Q(s',a') − Q(s,a) ]",
            font_size=21,
            color=INK,
        )
        content = VGroup(label, formula).arrange(RIGHT, buff=0.28).move_to(card)
        return VGroup(card, content)
