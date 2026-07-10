export function mount(root, { createChallenge }) {
  createChallenge(root, {
    question: "En “riesgo alto → bloquear → +8 → riesgo medio”, ¿qué representa +8?",
    options: [
      {
        label: "El valor Q",
        correct: false,
        feedback: "El valor Q es una estimación aprendida del retorno y puede diferir de +8."
      },
      {
        label: "La recompensa proxy inmediata",
        correct: true,
        feedback: "+8 evalúa esa transición mediante la señal proxy definida por el entorno."
      },
      {
        label: "El siguiente estado",
        correct: false,
        feedback: "El siguiente estado de la transición es riesgo medio."
      }
    ]
  });
}
