from manim import *


BG = "#F3F5F4"
INK = "#172320"
MUTED = "#54645F"
GREEN = "#176B5B"
GREEN_DARK = "#0F5447"
GREEN_LIGHT = "#E2F3EE"
AMBER = "#8A4B08"
AMBER_LIGHT = "#FFF8E7"
SUCCESS = "#166534"
SUCCESS_LIGHT = "#ECFDF3"
BORDER = "#8FA39C"
WHITE_CARD = "#FFFFFF"


class QueEsRLCycle(Scene):
    """Introduce RL distinguiendo transición, retorno y política."""

    def construct(self):
        self.camera.background_color = BG

        title = Text(
            "¿Qué aprende un agente?",
            font_size=42,
            color=INK,
            weight=BOLD,
        ).to_edge(UP)

        subtitle = Text(
            "Aprende una política para maximizar el retorno esperado,\n"
            "no solamente la recompensa del último paso.",
            font_size=25,
            color=MUTED,
            line_spacing=1.15,
        ).next_to(title, DOWN, buff=0.24)

        self.play(Write(title), FadeIn(subtitle, shift=DOWN * 0.12))

        agent = self.entity_card(
            "Agente",
            "observa y decide",
            GREEN_LIGHT,
            GREEN,
        ).move_to(LEFT * 3.25 + UP * 0.25)

        environment = self.entity_card(
            "Entorno",
            "responde a la acción",
            WHITE_CARD,
            BORDER,
        ).move_to(RIGHT * 3.25 + UP * 0.25)

        state = self.info_chip(
            "Estado observado",
            "Riesgo alto",
            AMBER_LIGHT,
            AMBER,
        ).next_to(environment, UP, buff=0.36)

        action_arrow = Arrow(
            agent.get_right(),
            environment.get_left(),
            buff=0.18,
            color=GREEN,
            stroke_width=5,
        )
        action = Text(
            "Acción: bloquear",
            font_size=23,
            color=GREEN_DARK,
            weight=BOLD,
        ).next_to(action_arrow, UP, buff=0.16)

        feedback_arrow = Arrow(
            environment.get_left() + DOWN * 0.58,
            agent.get_right() + DOWN * 0.58,
            buff=0.18,
            color=AMBER,
            stroke_width=5,
        )
        feedback = VGroup(
            Text("Recompensa: +8", font_size=22, color=SUCCESS, weight=BOLD),
            Text("Siguiente estado: riesgo medio", font_size=21, color=INK),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.10)
        feedback.next_to(feedback_arrow, DOWN, buff=0.14)

        self.play(FadeIn(agent), FadeIn(environment), FadeIn(state))
        self.play(GrowArrow(action_arrow), FadeIn(action, shift=UP * 0.08))
        self.play(GrowArrow(feedback_arrow), FadeIn(feedback, shift=DOWN * 0.08))
        self.wait(0.8)

        loop_group = VGroup(
            agent,
            environment,
            state,
            action_arrow,
            action,
            feedback_arrow,
            feedback,
        )
        self.play(FadeOut(loop_group), subtitle.animate.set_opacity(0.55))

        trajectory_title = Text(
            "Una política conecta muchas transiciones",
            font_size=29,
            color=INK,
            weight=BOLD,
        ).move_to(UP * 1.9)

        transitions = VGroup(
            self.transition_card(
                "Paso 1",
                "Riesgo alto",
                "Bloquear",
                "+8",
                "Riesgo medio",
                GREEN_LIGHT,
                GREEN,
            ),
            self.transition_card(
                "Paso 2",
                "Riesgo medio",
                "Observar",
                "+6",
                "Riesgo bajo",
                AMBER_LIGHT,
                AMBER,
            ),
            self.transition_card(
                "Paso 3",
                "Riesgo bajo",
                "Permitir",
                "+8",
                "Riesgo bajo",
                SUCCESS_LIGHT,
                SUCCESS,
            ),
        ).arrange(RIGHT, buff=0.42).scale(0.88)
        transitions.move_to(UP * 0.35)

        arrows = VGroup(
            *[
                Arrow(
                    transitions[index].get_right(),
                    transitions[index + 1].get_left(),
                    buff=0.10,
                    color=MUTED,
                    max_tip_length_to_length_ratio=0.18,
                )
                for index in range(len(transitions) - 1)
            ]
        )

        self.play(Write(trajectory_title))
        self.play(FadeIn(transitions[0], shift=UP * 0.12))
        for index in range(1, len(transitions)):
            self.play(
                GrowArrow(arrows[index - 1]),
                FadeIn(transitions[index], shift=UP * 0.12),
                run_time=0.65,
            )

        return_title = Text(
            "Retorno descontado con γ = 0,8",
            font_size=25,
            color=MUTED,
        )
        return_formula = Text(
            "G₀ = 8 + 0,8 × 6 + 0,8² × 8 = 17,92",
            font_size=31,
            color=GREEN_DARK,
            weight=BOLD,
        )
        return_group = VGroup(return_title, return_formula).arrange(DOWN, buff=0.14)
        return_group.next_to(transitions, DOWN, buff=0.45)

        policy = VGroup(
            self.policy_chip("Riesgo alto", "Bloquear"),
            self.policy_chip("Riesgo medio", "Observar"),
            self.policy_chip("Riesgo bajo", "Permitir"),
        ).arrange(RIGHT, buff=0.25)
        policy.scale(0.86)
        policy.to_edge(DOWN, buff=0.32)

        policy_label = Text(
            "Política aprendida",
            font_size=22,
            color=MUTED,
        ).next_to(policy, UP, buff=0.12)

        self.play(FadeIn(return_group, shift=UP * 0.12))
        self.play(FadeIn(policy_label), LaggedStart(*[FadeIn(item) for item in policy], lag_ratio=0.18))
        self.play(Indicate(return_formula, color=GREEN))
        self.wait(2)

    def entity_card(self, title, description, fill, stroke):
        box = RoundedRectangle(
            width=3.25,
            height=1.35,
            corner_radius=0.16,
            color=stroke,
            fill_color=fill,
            fill_opacity=1,
            stroke_width=2.5,
        )
        texts = VGroup(
            Text(title, font_size=29, color=INK, weight=BOLD),
            Text(description, font_size=20, color=MUTED),
        ).arrange(DOWN, buff=0.12)
        texts.move_to(box)
        return VGroup(box, texts)

    def info_chip(self, label, value, fill, stroke):
        box = RoundedRectangle(
            width=3.15,
            height=0.88,
            corner_radius=0.14,
            color=stroke,
            fill_color=fill,
            fill_opacity=1,
            stroke_width=2,
        )
        texts = VGroup(
            Text(label, font_size=17, color=MUTED),
            Text(value, font_size=22, color=INK, weight=BOLD),
        ).arrange(DOWN, buff=0.06)
        texts.move_to(box)
        return VGroup(box, texts)

    def transition_card(self, step, state, action, reward, next_state, fill, stroke):
        box = RoundedRectangle(
            width=3.45,
            height=2.35,
            corner_radius=0.16,
            color=stroke,
            fill_color=fill,
            fill_opacity=1,
            stroke_width=2.2,
        )
        content = VGroup(
            Text(step, font_size=19, color=stroke, weight=BOLD),
            Text(state, font_size=23, color=INK, weight=BOLD),
            Text(f"Acción: {action}", font_size=19, color=MUTED),
            Text(f"Recompensa: {reward}", font_size=20, color=SUCCESS, weight=BOLD),
            Text(f"→ {next_state}", font_size=18, color=INK),
        ).arrange(DOWN, buff=0.10)
        content.move_to(box)
        return VGroup(box, content)

    def policy_chip(self, state, action):
        box = RoundedRectangle(
            width=3.45,
            height=0.72,
            corner_radius=0.14,
            color=GREEN,
            fill_color=WHITE_CARD,
            fill_opacity=1,
            stroke_width=2,
        )
        text = Text(
            f"{state} → {action}",
            font_size=20,
            color=GREEN_DARK,
            weight=BOLD,
        ).move_to(box)
        return VGroup(box, text)
