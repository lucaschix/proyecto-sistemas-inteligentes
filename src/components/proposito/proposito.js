export function mount(root, { createChallenge }) {
  createChallenge(root, {
    question: "¿Cuál es el objetivo principal de esta aplicación?",
    options: [
      {
        label: "Crear un sistema real de defensa",
        correct: false,
        feedback: "La aplicación no analiza tráfico ni controla una red; usa reglas educativas."
      },
      {
        label: "Comprender decisiones secuenciales con recompensas",
        correct: true,
        feedback: "La demostración conecta cada acción con su recompensa proxy, siguiente estado y valor Q."
      },
      {
        label: "Reemplazar a un analista de seguridad",
        correct: false,
        feedback: "El modelo omite incertidumbre, contexto operativo y supervisión humana."
      }
    ]
  });
}
