export function mount(root, { createChallenge }) {
  createChallenge(root, {
    question: "¿Qué pregunta caracteriza al aprendizaje por refuerzo?",
    options: [
      {
        label: "¿Qué nivel de riesgo predigo?",
        correct: false,
        feedback: "Esa es una tarea predictiva; en la demostración el riesgo ya viene estimado."
      },
      {
        label: "¿Cómo se agrupan los datos?",
        correct: false,
        feedback: "Agrupar datos sin etiquetas corresponde a aprendizaje no supervisado."
      },
      {
        label: "¿Qué acción favorece las consecuencias futuras?",
        correct: true,
        feedback: "RL selecciona acciones considerando cómo modifican estados y recompensas posteriores."
      }
    ]
  });
}
