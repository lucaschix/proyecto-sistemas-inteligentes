export function mount(root, { createChallenge }) {
  createChallenge(root, {
    question: "¿Qué ocurre inmediatamente después de que el agente actúa?",
    options: [
      {
        label: "El entorno entrega recompensa y siguiente estado",
        correct: true,
        feedback: "Ambos datos completan la transición que Q-learning utiliza para actualizar."
      },
      {
        label: "El aprendizaje termina",
        correct: false,
        feedback: "El ciclo continúa; incluso el quinto paso solo trunca el segmento visible."
      },
      {
        label: "La política greedy se elimina",
        correct: false,
        feedback: "La política se deriva de los valores Q actualizados; no se elimina."
      }
    ]
  });
}
