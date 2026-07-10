from manim import *


class QLearningTableUpdate(Scene):
    def construct(self):
        self.camera.background_color = "#f3f5f4"

        title = Text("Transicion y tabla Q", font_size=38, color="#172320")
        title.to_edge(UP)

        transition = VGroup(
            self.step_box("Estado", "Riesgo alto", "#fff8e7", "#8a4b08"),
            self.step_box("Accion", "Bloquear", "#e2f3ee", "#176b5b"),
            self.step_box("Recompensa", "+8", "#ecfdf3", "#166534"),
            self.step_box("Siguiente estado", "Riesgo medio", "#ffffff", "#8fa39c"),
        ).arrange(RIGHT, buff=0.22).scale(0.68)
        transition.to_edge(UP, buff=1.25)

        arrows = VGroup()
        for left, right in zip(transition[:-1], transition[1:]):
            arrows.add(Arrow(left.get_right(), right.get_left(), color="#54645f", buff=0.08, max_tip_length_to_length_ratio=0.22))

        q_label = Text("Celda entrenada", font_size=24, color="#54645f")
        q_cell = RoundedRectangle(width=3.5, height=1.15, corner_radius=0.14, color="#176b5b", fill_color="#e2f3ee", fill_opacity=1)
        q_cell_text = Text("Q(alto, bloquear)", font_size=27, color="#0f5447", weight=BOLD).move_to(q_cell)
        q_group = VGroup(q_label, VGroup(q_cell, q_cell_text)).arrange(DOWN, buff=0.18)
        q_group.move_to(LEFT * 3.0 + DOWN * 0.65)

        formula = VGroup(
            Text("Objetivo TD = 8 + 0.8 x 6 = 12.8", font_size=24, color="#172320"),
            Text("Nuevo Q = 4 + 0.5 x (12.8 - 4)", font_size=24, color="#172320"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
        formula.move_to(RIGHT * 2.5 + DOWN * 0.2)

        value_before = Text("4.00", font_size=36, color="#8a4b08", weight=BOLD)
        value_arrow = Arrow(LEFT, RIGHT, color="#176b5b", buff=0.15)
        value_after = Text("8.40", font_size=42, color="#166534", weight=BOLD)
        value_change = VGroup(value_before, value_arrow, value_after).arrange(RIGHT, buff=0.28)
        value_change.next_to(formula, DOWN, buff=0.5)

        table = self.q_table()
        table.to_edge(DOWN, buff=0.25)

        link = Arrow(q_group.get_bottom(), table.get_top() + LEFT * 0.8, color="#176b5b", buff=0.12)
        conclusion = Text("Solo cambia la combinacion estado-accion entrenada en este paso.", font_size=22, color="#54645f")
        conclusion.next_to(value_change, DOWN, buff=0.42)

        self.play(Write(title))
        self.play(FadeIn(transition[0], shift=UP * 0.15))
        for index in range(1, len(transition)):
            self.play(GrowArrow(arrows[index - 1]), FadeIn(transition[index], shift=UP * 0.15), run_time=0.65)

        self.play(FadeIn(q_group, shift=RIGHT * 0.2))
        self.play(Write(formula))
        self.play(Write(value_before), GrowArrow(value_arrow), Write(value_after))
        self.play(FadeIn(table, shift=UP * 0.2), GrowArrow(link))
        self.play(Indicate(table[2], color="#176b5b"), Write(conclusion))
        self.wait(2)

    def step_box(self, label, value, fill, stroke):
        box = RoundedRectangle(width=2.45, height=1.28, corner_radius=0.14, color=stroke, fill_color=fill, fill_opacity=1)
        label_text = Text(label, font_size=18, color="#54645f")
        value_text = Text(value, font_size=23, color="#172320", weight=BOLD)
        text = VGroup(label_text, value_text).arrange(DOWN, buff=0.12).move_to(box)
        return VGroup(box, text)

    def q_table(self):
        header = VGroup(
            self.table_cell("Estado", "#172320", "#ffffff", 1.65),
            self.table_cell("Permitir", "#172320", "#ffffff", 1.65),
            self.table_cell("Bloquear", "#172320", "#ffffff", 1.65),
        ).arrange(RIGHT, buff=0)

        low = VGroup(
            self.table_cell("Riesgo bajo", "#172320", "#ffffff", 1.65),
            self.table_cell("2.10", "#54645f", "#ffffff", 1.65),
            self.table_cell("1.60", "#54645f", "#ffffff", 1.65),
        ).arrange(RIGHT, buff=0)

        high = VGroup(
            self.table_cell("Riesgo alto", "#172320", "#ffffff", 1.65),
            self.table_cell("-2.00", "#54645f", "#ffffff", 1.65),
            self.table_cell("8.40", "#0f5447", "#e2f3ee", 1.65),
        ).arrange(RIGHT, buff=0)

        return VGroup(header, low, high).arrange(DOWN, buff=0)

    def table_cell(self, text, color, fill, width):
        box = Rectangle(width=width, height=0.58, color="#8fa39c", fill_color=fill, fill_opacity=1)
        label = Text(text, font_size=17, color=color, weight=BOLD if text == "8.40" else NORMAL)
        label.move_to(box)
        return VGroup(box, label)
