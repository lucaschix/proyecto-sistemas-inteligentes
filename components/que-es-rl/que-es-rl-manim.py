from manim import *


class QueEsRLCycle(Scene):
    def construct(self):
        self.camera.background_color = "#f3f5f4"

        title = Text("Ciclo agente-entorno", font_size=40, color="#172320")
        title.to_edge(UP)

        agent = RoundedRectangle(width=3.0, height=1.25, corner_radius=0.16, color="#176b5b", fill_color="#e2f3ee", fill_opacity=1)
        agent_label = Text("Agente", font_size=30, color="#0f5447").move_to(agent)
        agent_group = VGroup(agent, agent_label).shift(LEFT * 3)

        environment = RoundedRectangle(width=3.25, height=1.25, corner_radius=0.16, color="#8fa39c", fill_color="#ffffff", fill_opacity=1)
        environment_label = Text("Entorno", font_size=30, color="#172320").move_to(environment)
        environment_group = VGroup(environment, environment_label).shift(RIGHT * 3)

        state = Text("Estado observado: Riesgo alto", font_size=24, color="#172320").next_to(environment_group, UP, buff=0.55)
        action = Text("Accion: Bloquear", font_size=24, color="#0f5447")
        reward = Text("Recompensa: +8", font_size=24, color="#166534")
        next_state = Text("Siguiente estado: Riesgo medio", font_size=24, color="#172320")
        update = Text("Actualiza Q(alto, bloquear)", font_size=24, color="#8a4b08")

        arrow_action = Arrow(agent_group.get_right(), environment_group.get_left(), color="#176b5b", buff=0.18)
        arrow_feedback = Arrow(environment_group.get_left() + DOWN * 0.45, agent_group.get_right() + DOWN * 0.45, color="#8a4b08", buff=0.18)

        action.next_to(arrow_action, UP, buff=0.25)
        feedback_group = VGroup(reward, next_state).arrange(DOWN, aligned_edge=LEFT, buff=0.18).next_to(arrow_feedback, DOWN, buff=0.25)
        update.next_to(agent_group, DOWN, buff=0.7)

        loop_hint = Text("El ciclo se repite para aprender una politica", font_size=22, color="#54645f")
        loop_hint.to_edge(DOWN)

        self.play(Write(title))
        self.play(FadeIn(agent_group), FadeIn(environment_group))
        self.play(FadeIn(state, shift=DOWN * 0.2))
        self.play(GrowArrow(arrow_action), Write(action))
        self.play(GrowArrow(arrow_feedback), Write(feedback_group))
        self.play(Write(update))

        for _ in range(2):
            self.play(
                agent.animate.set_fill("#f8faf9"),
                environment.animate.set_fill("#e8f4f1"),
                run_time=0.45,
            )
            self.play(
                agent.animate.set_fill("#e2f3ee"),
                environment.animate.set_fill("#ffffff"),
                run_time=0.45,
            )

        self.play(Write(loop_hint))
        self.wait(2)
