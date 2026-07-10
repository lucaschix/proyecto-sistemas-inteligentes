export function mount(root, { createChallenge }) {
  createChallenge(root, {
    question: "¿Por qué no conviene bloquear todo evento extraño?",
    options: [
      {
        label: "Porque puede afectar tráfico legítimo",
        correct: true,
        feedback: "Bloquear actividad legítima puede interrumpir servicios y generar impacto de disponibilidad."
      },
      {
        label: "Porque bloquear siempre da recompensa",
        correct: false,
        feedback: "En riesgo bajo, bloquear recibe una penalización precisamente por su costo operativo."
      },
      {
        label: "Porque una anomalía nunca implica riesgo",
        correct: false,
        feedback: "Una anomalía puede ser relevante; el problema es que no equivale por sí sola a una amenaza confirmada."
      }
    ]
  });
}
