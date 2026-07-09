from manim import *


class ConceptosTransicion(Scene):
    def construct(self):
        self.camera.background_color = "#f3f5f4"

        title = Text("Una transicion RL completa", font_size=38, color="#172320")
        title.to_edge(UP)

        boxes = VGroup(
            self.step_box("Estado", "Riesgo alto", "#fff8e7", "#8a4b08"),
            self.step_box("Accion", "Bloquear", "#e2f3ee", "#176b5b"),
            self.step_box("Recompensa proxy", "+8", "#ecfdf3", "#166534"),
            self.step_box("Siguiente estado", "Riesgo medio", "#ffffff", "#8fa39c"),
        ).arrange(RIGHT, buff=0.35).scale(0.86)
        boxes.move_to(ORIGIN + UP * 0.35)

        arrows = VGroup()
        for left, right in zip(boxes[:-1], boxes[1:]):
            arrows.add(Arrow(left.get_right(), right.get_left(), color="#54645f", buff=0.1, max_tip_length_to_length_ratio=0.18))

        update = Text("La experiencia actualiza Q(alto, bloquear)", font_size=28, color="#0f5447")
        update.next_to(boxes, DOWN, buff=0.85)

        formula = Text("Q <- Q + alpha * (r + gamma * max Q' - Q)", font_size=25, color="#172320")
        formula.next_to(update, DOWN, buff=0.28)

        closing = Text("No se aprende de una etiqueta aislada, sino de la transicion completa.", font_size=22, color="#54645f")
        closing.to_edge(DOWN)

        self.play(Write(title))
        self.play(FadeIn(boxes[0], shift=UP * 0.2))
        for index in range(1, len(boxes)):
            self.play(GrowArrow(arrows[index - 1]), FadeIn(boxes[index], shift=UP * 0.2))
            self.wait(0.25)

        self.play(Write(update))
        self.play(Write(formula))
        self.play(Write(closing))
        self.wait(2)

    def step_box(self, label, value, fill, stroke):
        box = RoundedRectangle(width=2.55, height=1.55, corner_radius=0.14, color=stroke, fill_color=fill, fill_opacity=1)
        label_text = Text(label, font_size=20, color="#54645f")
        value_text = Text(value, font_size=25, color="#172320", weight=BOLD)
        text = VGroup(label_text, value_text).arrange(DOWN, buff=0.18).move_to(box)
        return VGroup(box, text)
