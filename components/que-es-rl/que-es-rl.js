export function mount(root, { createChallenge }) {
  createChallenge(root, {
    question: "¿Qué intenta maximizar una política de aprendizaje por refuerzo?",
    options: [
      {
        label: "La recompensa de la última acción solamente",
        correct: false,
        feedback: "Una recompensa describe un paso; no resume consecuencias futuras."
      },
      {
        label: "El retorno esperado a lo largo de las decisiones",
        correct: true,
        feedback: "El retorno reúne recompensas presentes y futuras según el horizonte y gamma."
      },
      {
        label: "La cantidad de estados disponibles",
        correct: false,
        feedback: "El número de estados describe el entorno, pero no es el objetivo de la política."
      }
    ]
  });
}
