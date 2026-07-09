export function mount(root, { createChallenge }) {
  createChallenge(root, {
    question: "¿Qué sucede al completar el quinto paso del simulador?",
    options: [
      {
        label: "La tarea termina de forma natural",
        correct: false,
        feedback: "La tarea es continuante y no tiene un estado terminal natural."
      },
      {
        label: "Se trunca el segmento visible",
        correct: true,
        feedback: "El límite externo detiene la visualización, aunque el entorno podría continuar."
      },
      {
        label: "El siguiente estado deja de existir",
        correct: false,
        feedback: "El quinto paso conserva un siguiente estado válido para el bootstrap."
      }
    ]
  });
}
