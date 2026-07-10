from manim import *


class CicloAprendizajeRecompensas(Scene):
    def construct(self):
        self.camera.background_color = "#f3f5f4"

        title = Text("Ciclo de aprendizaje por recompensas", font_size=34, color="#172320")
        title.to_edge(UP)

        steps = VGroup(
            self.step("1", "Observa", "Riesgo alto", "#fff8e7", "#8a4b08"),
            self.step("2", "Actua", "Bloquear", "#e2f3ee", "#176b5b"),
            self.step("3", "Recibe", "+8 y riesgo medio", "#ecfdf3", "#166534"),
            self.step("4", "Actualiza", "Q(alto, bloquear)", "#ffffff", "#0f5447"),
            self.step("5", "Continua", "Nuevo ciclo", "#f8faf9", "#54645f"),
        ).arrange(RIGHT, buff=0.16).scale(0.74)
        steps.move_to(UP * 0.75)

        arrows = VGroup()
        for left, right in zip(steps[:-1], steps[1:]):
            arrows.add(Arrow(left.get_right(), right.get_left(), color="#54645f", buff=0.08, max_tip_length_to_length_ratio=0.18))

        loop_arrow = CurvedArrow(
            steps[-1].get_bottom() + DOWN * 0.15,
            steps[0].get_bottom() + DOWN * 0.15,
            angle=-TAU / 4,
            color="#176b5b",
        )
        loop_text = Text("El aprendizaje se repite con nuevas transiciones", font_size=24, color="#0f5447")
        loop_text.next_to(loop_arrow, DOWN, buff=0.25)

        note = Text(
            "En el quinto paso la visualizacion se trunca, pero el valor futuro se conserva.",
            font_size=22,
            color="#54645f",
        )
        note.to_edge(DOWN)

        self.play(Write(title))
        self.play(FadeIn(steps[0], shift=UP * 0.15))
        for index in range(1, len(steps)):
            self.play(GrowArrow(arrows[index - 1]), FadeIn(steps[index], shift=UP * 0.15), run_time=0.65)
        self.play(Create(loop_arrow), Write(loop_text))
        self.play(Indicate(steps[3], color="#176b5b"), Write(note))
        self.wait(2)

    def step(self, number, label, value, fill, stroke):
        circle = Circle(radius=0.23, color=stroke, fill_color=stroke, fill_opacity=1)
        number_text = Text(number, font_size=18, color="#ffffff", weight=BOLD).move_to(circle)
        box = RoundedRectangle(width=2.18, height=1.55, corner_radius=0.14, color=stroke, fill_color=fill, fill_opacity=1)
        label_text = Text(label, font_size=19, color="#54645f")
        value_text = Text(value, font_size=20, color="#172320", weight=BOLD)
        content = VGroup(label_text, value_text).arrange(DOWN, buff=0.15).move_to(box)
        badge = VGroup(circle, number_text).next_to(box, UP, buff=-0.18)
        return VGroup(box, content, badge)
