import {
  createSeededRandom,
  deterministicValueIteration,
  discountedReturn,
  qLearningUpdate,
  scoreAnswers,
  simulatePolicy,
} from "./didactic-core.js";

import {
  actionDefinitions,
  actionOrder,
  getOutcome,
  metricOrder,
  outcomeModel,
  stateDefinitions,
  stateOrder,
} from "../components/rl-model.js";

const STORAGE_KEY = "rl-didactic-progress-v1";
const ENHANCED_SLIDES = [
  "proposito",
  "que-es-rl",
  "comparacion",
  "caso-practico",
  "conceptos",
  "modelado",
  "ciclo",
  "q-learning",
  "simulador",
];

const SLIDE_LABELS = {
  proposito: "Propósito",
  "que-es-rl": "Qué es RL",
  comparacion: "Comparación",
  "caso-practico": "Caso práctico",
  conceptos: "Conceptos",
  modelado: "Modelado",
  ciclo: "Ciclo",
  "q-learning": "Q-learning",
  simulador: "Simulador",
  "robot-repartidor": "Robot repartidor",
};

let latestContext = null;
let latestSlide = null;
let mountSequence = 0;

function readProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");

    return {
      visited: Array.isArray(stored.visited) ? stored.visited : [],
      completed: stored.completed && typeof stored.completed === "object"
        ? stored.completed
        : {},
      activities: stored.activities && typeof stored.activities === "object"
        ? stored.activities
        : {},
    };
  } catch {
    return { visited: [], completed: {}, activities: {} };
  }
}

function writeProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  renderProgressPanel();
}

function markVisited(slide) {
  if (!slide) return;

  const progress = readProgress();

  if (!progress.visited.includes(slide)) {
    progress.visited.push(slide);
    writeProgress(progress);
  } else {
    renderProgressPanel();
  }
}

function markActivity(slide, activity, completed = true) {
  const progress = readProgress();
  progress.activities[`${slide}:${activity}`] = Boolean(completed);

  if (completed) {
    progress.completed[slide] = true;
  }

  writeProgress(progress);
}

function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  renderProgressPanel();
}

function ensureProgressPanel() {
  const sideMenu = document.querySelector(".side-menu");
  if (!sideMenu || sideMenu.querySelector("#didactic-progress-panel")) return;

  const panel = document.createElement("section");
  panel.id = "didactic-progress-panel";
  panel.className = "didactic-progress-panel";
  panel.setAttribute("aria-labelledby", "didactic-progress-title");
  panel.innerHTML = `
    <div class="didactic-progress-heading">
      <div>
        <p class="didactic-eyebrow">Progreso local</p>
        <h2 id="didactic-progress-title">Ruta de aprendizaje</h2>
      </div>
      <output id="didactic-progress-percent">0 %</output>
    </div>
    <progress id="didactic-progress-bar" max="${ENHANCED_SLIDES.length}" value="0"></progress>
    <p id="didactic-progress-summary">0 actividades completadas.</p>
    <ul id="didactic-progress-list"></ul>
    <button class="button button-secondary didactic-reset-progress" type="button">
      Reiniciar progreso
    </button>
  `;

  sideMenu.append(panel);
  panel.querySelector(".didactic-reset-progress").addEventListener("click", () => {
    if (window.confirm("¿Reiniciar el progreso de las actividades didácticas?")) {
      resetProgress();
    }
  });
}

function renderProgressPanel() {
  ensureProgressPanel();

  const panel = document.querySelector("#didactic-progress-panel");
  if (!panel) return;

  const progress = readProgress();
  const completedCount = ENHANCED_SLIDES.filter(
    (slide) => progress.completed[slide],
  ).length;
  const percent = Math.round((completedCount / ENHANCED_SLIDES.length) * 100);

  panel.querySelector("#didactic-progress-percent").value = `${percent} %`;
  panel.querySelector("#didactic-progress-bar").value = completedCount;
  panel.querySelector("#didactic-progress-summary").textContent =
    `${completedCount} de ${ENHANCED_SLIDES.length} actividades completadas.`;

  const list = panel.querySelector("#didactic-progress-list");
  list.innerHTML = ENHANCED_SLIDES.map((slide) => {
    const completed = Boolean(progress.completed[slide]);
    const visited = progress.visited.includes(slide);
    const status = completed ? "Completada" : visited ? "Visitada" : "Pendiente";

    return `
      <li data-progress-status="${completed ? "completed" : visited ? "visited" : "pending"}">
        <span aria-hidden="true">${completed ? "✓" : visited ? "●" : "○"}</span>
        <span>${SLIDE_LABELS[slide]}</span>
        <small>${status}</small>
      </li>
    `;
  }).join("");

  document.querySelectorAll(".section-link[data-slide]").forEach((link) => {
    const slide = link.dataset.slide;
    const completed = Boolean(progress.completed[slide]);
    const visited = progress.visited.includes(slide);

    link.dataset.learningStatus = completed
      ? "completed"
      : visited
        ? "visited"
        : "pending";
  });
}

function formatNumber(value, digits = 2) {
  return Number(value).toLocaleString("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatSigned(value) {
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${formatNumber(number, 0)}`;
}

function createActivity({
  id,
  eyebrow,
  title,
  description,
  className = "",
}) {
  const section = document.createElement("section");
  section.id = id;
  section.className = `didactic-activity ${className}`.trim();
  section.setAttribute("aria-labelledby", `${id}-title`);
  section.innerHTML = `
    <div class="didactic-activity-heading">
      <div>
        <p class="didactic-eyebrow">${eyebrow}</p>
        <h3 id="${id}-title">${title}</h3>
      </div>
      <span class="didactic-activity-status" data-activity-status="pending">
        Actividad pendiente
      </span>
    </div>
    ${description ? `<p class="didactic-activity-description">${description}</p>` : ""}
    <div class="didactic-activity-body"></div>
  `;

  return section;
}

function completeActivity(section, slide, activity, message = "Actividad completada") {
  const status = section.querySelector(".didactic-activity-status");
  status.textContent = message;
  status.dataset.activityStatus = "completed";
  markActivity(slide, activity, true);
}

function insertActivity(root, section) {
  const article = root.querySelector("article") ?? root;
  const challenge = article.querySelector(".mini-challenge");

  if (challenge) {
    challenge.insertAdjacentElement("beforebegin", section);
  } else {
    article.append(section);
  }
}

function optionButton(label, value) {
  return `<button class="didactic-choice" type="button" data-value="${value}">${label}</button>`;
}

function mountPurpose(root) {
  const section = createActivity({
    id: "didactic-purpose-diagnostic",
    eyebrow: "Diagnóstico inicial",
    title: "Distingue el alcance real de la aplicación",
    description:
      "Clasifica cada afirmación antes de continuar. El objetivo es evitar confundir una simulación educativa con un sistema de seguridad operacional.",
  });

  const statements = [
    {
      text: "El agente recibe un nivel de riesgo previamente estimado.",
      answer: "correcta",
      explanation: "El modelo recibe estados discretos: riesgo bajo, medio o alto.",
    },
    {
      text: "La aplicación inspecciona paquetes de una red real.",
      answer: "incorrecta",
      explanation: "La aplicación trabaja con escenarios simulados y no captura tráfico real.",
    },
    {
      text: "Una recompensa alta demuestra que una decisión es segura en producción.",
      answer: "incorrecta",
      explanation: "La recompensa es una señal proxy definida por el entorno educativo.",
    },
    {
      text: "Cambiar las recompensas puede cambiar la conducta aprendida.",
      answer: "correcta",
      explanation: "El agente optimiza la señal que recibe, no una intención implícita.",
    },
  ];

  const body = section.querySelector(".didactic-activity-body");
  body.innerHTML = `
    <div class="didactic-diagnostic-list">
      ${statements.map((statement, index) => `
        <fieldset class="didactic-question-card" data-index="${index}">
          <legend>${statement.text}</legend>
          <div class="didactic-choice-row" role="group" aria-label="Clasificación">
            ${optionButton("Correcta", "correcta")}
            ${optionButton("Incorrecta", "incorrecta")}
            ${optionButton("Depende", "depende")}
          </div>
          <p class="didactic-inline-feedback" aria-live="polite"></p>
        </fieldset>
      `).join("")}
    </div>
    <button class="button didactic-check" type="button">Comprobar diagnóstico</button>
    <p class="didactic-result" role="status"></p>
  `;

  body.querySelectorAll(".didactic-choice").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".didactic-question-card");
      card.querySelectorAll(".didactic-choice").forEach((choice) => {
        choice.classList.toggle("is-selected", choice === button);
        choice.setAttribute("aria-pressed", String(choice === button));
      });
      card.dataset.answer = button.dataset.value;
    });
  });

  body.querySelector(".didactic-check").addEventListener("click", () => {
    let correct = 0;

    statements.forEach((statement, index) => {
      const card = body.querySelector(`[data-index="${index}"]`);
      const selected = card.dataset.answer;
      const isCorrect = selected === statement.answer;
      const feedback = card.querySelector(".didactic-inline-feedback");

      card.dataset.result = selected ? (isCorrect ? "correct" : "incorrect") : "missing";
      feedback.textContent = selected
        ? `${isCorrect ? "Correcto. " : "Revisa. "}${statement.explanation}`
        : "Selecciona una clasificación.";

      correct += Number(isCorrect);
    });

    body.querySelector(".didactic-result").textContent =
      `Resultado: ${correct} de ${statements.length} afirmaciones correctas.`;

    if (correct === statements.length) {
      completeActivity(section, "proposito", "diagnostic");
    }
  });

  insertActivity(root, section);
}

function mountReturnCalculator(root) {
  const section = createActivity({
    id: "didactic-return-calculator",
    eyebrow: "Experimenta",
    title: "Recompensa inmediata frente a retorno",
    description:
      "Modifica gamma y observa cuánto influyen las recompensas de decisiones futuras.",
  });

  const body = section.querySelector(".didactic-activity-body");
  body.innerHTML = `
    <div class="didactic-return-layout">
      <div class="didactic-trajectory" aria-label="Trayectoria de tres recompensas">
        <div><strong>Paso 1</strong><span>Bloquear</span><output>+8</output></div>
        <span aria-hidden="true">→</span>
        <div><strong>Paso 2</strong><span>Observar</span><output>+6</output></div>
        <span aria-hidden="true">→</span>
        <div><strong>Paso 3</strong><span>Permitir</span><output>+8</output></div>
      </div>

      <label class="didactic-range-control" for="didactic-gamma-return">
        <span><strong>Gamma (γ)</strong> · importancia de las recompensas futuras</span>
        <span class="didactic-range-row">
          <input id="didactic-gamma-return" type="range" min="0" max="0.9" step="0.1" value="0.8">
          <output id="didactic-gamma-return-value">0,8</output>
        </span>
      </label>

      <div class="didactic-formula-card">
        <p>G₀ = 8 + γ × 6 + γ² × 8</p>
        <strong>Retorno: <output id="didactic-return-result">17,92</output></strong>
      </div>

      <fieldset class="didactic-single-question">
        <legend>Con γ = 0, ¿qué recompensas influyen en G₀?</legend>
        <label><input type="radio" name="return-question" value="all"> Las tres recompensas</label>
        <label><input type="radio" name="return-question" value="first"> Solo la recompensa inmediata</label>
        <label><input type="radio" name="return-question" value="last"> Solo la recompensa final</label>
      </fieldset>

      <button class="button didactic-check" type="button">Comprobar comprensión</button>
      <p class="didactic-result" role="status"></p>
    </div>
  `;

  const slider = body.querySelector("#didactic-gamma-return");
  const gammaOutput = body.querySelector("#didactic-gamma-return-value");
  const resultOutput = body.querySelector("#didactic-return-result");

  function render() {
    const gamma = Number(slider.value);
    gammaOutput.value = formatNumber(gamma, 1);
    resultOutput.value = formatNumber(discountedReturn([8, 6, 8], gamma), 2);
  }

  slider.addEventListener("input", render);
  body.querySelector(".didactic-check").addEventListener("click", () => {
    const answer = body.querySelector('input[name="return-question"]:checked');
    const result = body.querySelector(".didactic-result");

    if (!answer) {
      result.textContent = "Selecciona una respuesta.";
      return;
    }

    if (answer.value === "first") {
      result.textContent =
        "Correcto. Con γ = 0, el agente solo considera la recompensa inmediata.";
      completeActivity(section, "que-es-rl", "return-calculator");
    } else {
      result.textContent =
        "Revisa: las recompensas futuras se multiplican por potencias de cero.";
    }
  });

  render();
  insertActivity(root, section);
}

function mountComparisonGame(root) {
  const section = createActivity({
    id: "didactic-approach-classifier",
    eyebrow: "Toma una decisión técnica",
    title: "¿Qué enfoque utilizarías?",
    description:
      "Selecciona el método más apropiado para cada problema. No todos los problemas secuenciales requieren aprendizaje por refuerzo.",
  });

  const approaches = [
    ["rules", "Reglas"],
    ["supervised", "Aprendizaje supervisado"],
    ["bandit", "Bandit contextual"],
    ["planning", "Planificación"],
    ["rl", "Aprendizaje por refuerzo"],
  ];

  const cases = [
    {
      text: "Bloquear siempre las direcciones IP incluidas en una lista fija.",
      answer: "rules",
    },
    {
      text: "Clasificar solicitudes usando miles de ejemplos etiquetados como normales o anómalos.",
      answer: "supervised",
    },
    {
      text: "Elegir una recomendación y observar una recompensa inmediata sin que cambie el estado futuro.",
      answer: "bandit",
    },
    {
      text: "Calcular una ruta con un mapa conocido, costos conocidos y un modelo completo.",
      answer: "planning",
    },
    {
      text: "Decidir ante riesgos sucesivos, donde cada acción modifica el siguiente estado.",
      answer: "rl",
    },
  ];

  const body = section.querySelector(".didactic-activity-body");
  body.innerHTML = `
    <div class="didactic-case-list">
      ${cases.map((item, index) => `
        <label class="didactic-select-card">
          <span>${index + 1}. ${item.text}</span>
          <select data-case-index="${index}">
            <option value="">Selecciona un enfoque</option>
            ${approaches.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
          </select>
        </label>
      `).join("")}
    </div>
    <button class="button didactic-check" type="button">Evaluar decisiones</button>
    <p class="didactic-result" role="status"></p>
  `;

  body.querySelector(".didactic-check").addEventListener("click", () => {
    const selected = cases.map((_, index) =>
      body.querySelector(`[data-case-index="${index}"]`).value,
    );
    const score = scoreAnswers(selected, cases.map((item) => item.answer));

    body.querySelectorAll("[data-case-index]").forEach((select, index) => {
      select.dataset.result =
        select.value === cases[index].answer ? "correct" : "incorrect";
    });

    body.querySelector(".didactic-result").textContent =
      `Resultado: ${score.correct} de ${score.total}. ` +
      (score.correct >= 4
        ? "Puedes distinguir cuándo RL aporta una ventaja."
        : "Revisa si existe estado futuro, etiquetas, reglas o un modelo conocido.");

    if (score.correct >= 4) {
      completeActivity(section, "comparacion", "approach-classifier");
    }
  });

  insertActivity(root, section);
}

function mountNetworkLab(root) {
  const section = createActivity({
    id: "didactic-network-lab",
    eyebrow: "Caso aplicado · Vista 2.5D",
    title: "Centro de operaciones de red",
    description:
      "Selecciona un flujo, revisa sus señales y toma una decisión. La escena es visual; el modelo de RL continúa recibiendo un riesgo discreto.",
    className: "didactic-network-activity",
  });

  const scenarios = [
    {
      flow: "Flujo A",
      target: "Servidor web",
      state: "alto",
      facts: ["IP externa nueva", "18 intentos fallidos / 2 min", "Panel administrativo"],
      best: ["bloquear", "bloquear_alertar"],
    },
    {
      flow: "Flujo B",
      target: "Servidor de respaldo",
      state: "bajo",
      facts: ["Servidor autorizado", "Ventana programada", "Patrón habitual"],
      best: ["permitir"],
    },
    {
      flow: "Flujo C",
      target: "API de consultas",
      state: "medio",
      facts: ["Cliente conocido", "3× sobre su media", "Evidencia ambigua"],
      best: ["observar", "bloquear_alertar"],
    },
  ];

  const body = section.querySelector(".didactic-activity-body");
  body.innerHTML = `
    <div class="didactic-network-layout">
      <div class="didactic-network-scene" aria-label="Topología visual de red">
        <div class="didactic-network-floor"></div>
        <button class="didactic-network-node node-internet" type="button" data-node="Internet">
          <span>Internet</span>
        </button>
        <button class="didactic-network-node node-router" type="button" data-node="Router">
          <span>Router</span>
        </button>
        <button class="didactic-network-node node-web" type="button" data-node="Servidor web">
          <span>Servidor web</span>
        </button>
        <button class="didactic-network-node node-db" type="button" data-node="Base de datos">
          <span>Base de datos</span>
        </button>
        <button class="didactic-network-node node-backup" type="button" data-node="Respaldo">
          <span>Respaldo</span>
        </button>
        <span class="didactic-network-line line-a" aria-hidden="true"></span>
        <span class="didactic-network-line line-b" aria-hidden="true"></span>
        <span class="didactic-network-line line-c" aria-hidden="true"></span>
        <span class="didactic-network-packet" id="didactic-network-packet" aria-hidden="true"></span>
      </div>

      <aside class="didactic-network-console">
        <p class="didactic-eyebrow">Decisión <output id="network-step">1</output> de ${scenarios.length}</p>
        <h4 id="network-flow">${scenarios[0].flow} · ${scenarios[0].target}</h4>
        <p>Riesgo estimado: <strong id="network-risk">Riesgo alto</strong></p>
        <ul id="network-facts"></ul>
        <div class="didactic-action-grid">
          ${actionOrder.map((action) => `
            <button class="didactic-choice" type="button" data-network-action="${action}">
              ${actionDefinitions[action].label}
            </button>
          `).join("")}
        </div>
        <div class="didactic-transition-output" id="network-outcome" aria-live="polite">
          Selecciona una acción para observar la transición.
        </div>
      </aside>
    </div>
  `;

  let index = 0;
  let decisions = 0;

  function renderScenario() {
    const scenario = scenarios[index];
    body.querySelector("#network-step").value = index + 1;
    body.querySelector("#network-flow").textContent =
      `${scenario.flow} · ${scenario.target}`;
    body.querySelector("#network-risk").textContent =
      stateDefinitions[scenario.state].label;
    body.querySelector("#network-risk").dataset.risk = scenario.state;
    body.querySelector("#network-facts").innerHTML =
      scenario.facts.map((fact) => `<li>${fact}</li>`).join("");
    body.querySelector("#network-outcome").textContent =
      "Selecciona una acción para observar la transición.";
    body.querySelectorAll("[data-network-action]").forEach((button) => {
      button.disabled = false;
      button.classList.remove("is-selected");
    });
    body.querySelector("#didactic-network-packet").dataset.scenario = String(index);
  }

  body.querySelectorAll("[data-network-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const scenario = scenarios[index];
      const action = button.dataset.networkAction;
      const outcome = getOutcome(scenario.state, action);
      const suitable = scenario.best.includes(action);

      body.querySelectorAll("[data-network-action]").forEach((item) => {
        item.disabled = true;
        item.classList.toggle("is-selected", item === button);
      });

      body.querySelector("#network-outcome").innerHTML = `
        <strong>${suitable ? "Decisión razonable para este escenario." : "Observa el costo de esta decisión."}</strong>
        <span>${stateDefinitions[scenario.state].label} → ${actionDefinitions[action].label}
        → ${formatSigned(outcome.reward)} → ${stateDefinitions[outcome.nextState].label}</span>
      `;

      decisions += 1;

      window.setTimeout(() => {
        index += 1;

        if (index >= scenarios.length) {
          completeActivity(section, "caso-practico", "network-lab");
          body.querySelector("#network-outcome").innerHTML +=
            "<strong> Completaste los tres flujos.</strong>";
          return;
        }

        renderScenario();
      }, 1100);
    });
  });

  renderScenario();
  insertActivity(root, section);
}

function mountTransitionBuilder(root) {
  const section = createActivity({
    id: "didactic-transition-builder",
    eyebrow: "Construye la experiencia",
    title: "Ordena los elementos de una transición",
    description:
      "Completa dos experiencias. Cada campo representa una parte distinta de la interacción agente–entorno.",
  });

  const exercises = [
    {
      state: "alto",
      action: "bloquear",
      reward: "8",
      nextState: "medio",
    },
    {
      state: "medio",
      action: "observar",
      reward: "6",
      nextState: "bajo",
    },
  ];

  const body = section.querySelector(".didactic-activity-body");
  body.innerHTML = `
    <div class="didactic-builder-progress">
      Ejercicio <output id="builder-index">1</output> de ${exercises.length}
    </div>
    <div class="didactic-transition-builder">
      <label>Estado s
        <select id="builder-state">
          <option value="">Selecciona</option>
          ${stateOrder.map((state) => `<option value="${state}">${stateDefinitions[state].label}</option>`).join("")}
        </select>
      </label>
      <span aria-hidden="true">→</span>
      <label>Acción a
        <select id="builder-action">
          <option value="">Selecciona</option>
          ${actionOrder.map((action) => `<option value="${action}">${actionDefinitions[action].label}</option>`).join("")}
        </select>
      </label>
      <span aria-hidden="true">→</span>
      <label>Recompensa r
        <select id="builder-reward">
          <option value="">Selecciona</option>
          ${[-10, -5, 1, 3, 6, 8, 10].map((reward) => `<option value="${reward}">${formatSigned(reward)}</option>`).join("")}
        </select>
      </label>
      <span aria-hidden="true">→</span>
      <label>Siguiente estado s′
        <select id="builder-next-state">
          <option value="">Selecciona</option>
          ${stateOrder.map((state) => `<option value="${state}">${stateDefinitions[state].label}</option>`).join("")}
        </select>
      </label>
    </div>
    <button class="button didactic-check" type="button">Comprobar transición</button>
    <p class="didactic-result" role="status"></p>
  `;

  let exerciseIndex = 0;

  body.querySelector(".didactic-check").addEventListener("click", () => {
    const expected = exercises[exerciseIndex];
    const answer = {
      state: body.querySelector("#builder-state").value,
      action: body.querySelector("#builder-action").value,
      reward: body.querySelector("#builder-reward").value,
      nextState: body.querySelector("#builder-next-state").value,
    };
    const correct = Object.keys(expected).every(
      (key) => String(answer[key]) === String(expected[key]),
    );
    const result = body.querySelector(".didactic-result");

    if (!correct) {
      result.textContent =
        "Revisa cada campo. La recompensa y el siguiente estado los entrega el entorno.";
      return;
    }

    exerciseIndex += 1;

    if (exerciseIndex >= exercises.length) {
      result.textContent =
        "Correcto. Construiste dos transiciones completas.";
      completeActivity(section, "conceptos", "transition-builder");
      body.querySelector(".didactic-check").disabled = true;
      return;
    }

    result.textContent = "Correcto. Continúa con la segunda experiencia.";
    body.querySelector("#builder-index").value = exerciseIndex + 1;
    body.querySelectorAll("select").forEach((select) => {
      select.value = "";
    });
  });

  insertActivity(root, section);
}

function cloneOutcomeModel() {
  return structuredClone(outcomeModel);
}

function mountRewardEditor(root) {
  const section = createActivity({
    id: "didactic-reward-editor",
    eyebrow: "Laboratorio de modelado",
    title: "Cambia las reglas y observa la política",
    description:
      "Este editor funciona como sandbox: no modifica el simulador principal. Permite experimentar con recompensas y transiciones deterministas.",
  });

  let editableModel = cloneOutcomeModel();
  const body = section.querySelector(".didactic-activity-body");

  body.innerHTML = `
    <div class="didactic-editor-toolbar">
      <label>Gamma
        <input id="editor-gamma" type="range" min="0" max="0.9" step="0.1" value="0.8">
        <output id="editor-gamma-value">0,8</output>
      </label>
      <button class="button" id="editor-calculate" type="button">Calcular política</button>
      <button class="button button-secondary" id="editor-aggressive" type="button">Cargar recompensa agresiva</button>
      <button class="button button-secondary" id="editor-reset" type="button">Restaurar modelo</button>
    </div>
    <div class="didactic-model-table-wrap">
      <table class="didactic-model-table">
        <caption>Editor de las 12 combinaciones estado–acción</caption>
        <thead>
          <tr>
            <th>Estado</th>
            <th>Acción</th>
            <th>Recompensa</th>
            <th>Siguiente estado</th>
          </tr>
        </thead>
        <tbody id="editor-model-body"></tbody>
      </table>
    </div>
    <div class="didactic-policy-output" id="editor-policy-output">
      Pulsa “Calcular política” para observar las acciones preferidas.
    </div>
  `;

  const tbody = body.querySelector("#editor-model-body");

  function renderRows() {
    tbody.innerHTML = stateOrder.flatMap((state) =>
      actionOrder.map((action) => {
        const outcome = editableModel[state][action];

        return `
          <tr data-editor-state="${state}" data-editor-action="${action}">
            <th>${stateDefinitions[state].label}</th>
            <td>${actionDefinitions[action].label}</td>
            <td>
              <input
                type="number"
                step="1"
                min="-30"
                max="30"
                value="${outcome.reward}"
                aria-label="Recompensa para ${stateDefinitions[state].label}, ${actionDefinitions[action].label}"
              >
            </td>
            <td>
              <select aria-label="Siguiente estado para ${stateDefinitions[state].label}, ${actionDefinitions[action].label}">
                ${stateOrder.map((candidate) => `
                  <option value="${candidate}" ${candidate === outcome.nextState ? "selected" : ""}>
                    ${stateDefinitions[candidate].label}
                  </option>
                `).join("")}
              </select>
            </td>
          </tr>
        `;
      }),
    ).join("");
  }

  function readRows() {
    tbody.querySelectorAll("tr").forEach((row) => {
      const state = row.dataset.editorState;
      const action = row.dataset.editorAction;
      editableModel[state][action].reward = Number(row.querySelector("input").value);
      editableModel[state][action].nextState = row.querySelector("select").value;
    });
  }

  function calculate() {
    readRows();
    const gamma = Number(body.querySelector("#editor-gamma").value);
    const result = deterministicValueIteration({
      outcomeModel: editableModel,
      states: stateOrder,
      actions: actionOrder,
      gamma,
    });

    body.querySelector("#editor-policy-output").innerHTML = `
      <h4>Política resultante</h4>
      <div class="didactic-policy-grid">
        ${stateOrder.map((state) => `
          <article>
            <span>${stateDefinitions[state].label}</span>
            <strong>${result.policy[state].actions.map((action) => actionDefinitions[action].label).join(" / ")}</strong>
            <small>Valor estimado: ${formatNumber(result.policy[state].value, 2)}</small>
          </article>
        `).join("")}
      </div>
      <p>
        La política cambia porque el agente optimiza exactamente las recompensas y transiciones
        definidas en este modelo.
      </p>
    `;

    completeActivity(section, "modelado", "reward-editor");
  }

  body.querySelector("#editor-gamma").addEventListener("input", (event) => {
    body.querySelector("#editor-gamma-value").value =
      formatNumber(event.target.value, 1);
  });

  body.querySelector("#editor-calculate").addEventListener("click", calculate);

  body.querySelector("#editor-aggressive").addEventListener("click", () => {
    editableModel = cloneOutcomeModel();

    stateOrder.forEach((state) => {
      editableModel[state].bloquear.reward = 12;
      editableModel[state].bloquear_alertar.reward = 11;
      editableModel[state].permitir.reward = -10;
      editableModel[state].observar.reward = -5;
    });

    renderRows();
    body.querySelector("#editor-policy-output").textContent =
      "Se cargó un diseño que premia bloquear incluso cuando el riesgo es bajo. Calcula la política y analiza el efecto.";
  });

  body.querySelector("#editor-reset").addEventListener("click", () => {
    editableModel = cloneOutcomeModel();
    renderRows();
    body.querySelector("#editor-policy-output").textContent =
      "Modelo original restaurado.";
  });

  renderRows();
  insertActivity(root, section);
}

function mountCyclePrediction(root) {
  const section = createActivity({
    id: "didactic-cycle-prediction",
    eyebrow: "Predice antes de revelar",
    title: "Completa el ciclo de interacción",
    description:
      "Parte desde riesgo alto y una acción de bloqueo. Predice qué devuelve el entorno y qué celda debe actualizar Q-learning.",
  });

  const body = section.querySelector(".didactic-activity-body");
  body.innerHTML = `
    <div class="didactic-cycle-start">
      <div><span>Estado</span><strong>Riesgo alto</strong></div>
      <span aria-hidden="true">→</span>
      <div><span>Acción</span><strong>Bloquear</strong></div>
    </div>

    <div class="didactic-prediction-grid">
      <label>Recompensa esperada
        <select id="cycle-reward">
          <option value="">Selecciona</option>
          ${[-10, -5, 1, 6, 8, 10].map((reward) => `<option value="${reward}">${formatSigned(reward)}</option>`).join("")}
        </select>
      </label>
      <label>Siguiente estado
        <select id="cycle-next-state">
          <option value="">Selecciona</option>
          ${stateOrder.map((state) => `<option value="${state}">${stateDefinitions[state].label}</option>`).join("")}
        </select>
      </label>
      <label>Celda que debe actualizarse
        <select id="cycle-q-cell">
          <option value="">Selecciona</option>
          <option value="alto:bloquear">Q(alto, bloquear)</option>
          <option value="medio:bloquear">Q(medio, bloquear)</option>
          <option value="alto:observar">Q(alto, observar)</option>
          <option value="all">Toda la tabla</option>
        </select>
      </label>
    </div>

    <button class="button didactic-check" type="button">Revelar transición</button>
    <div class="didactic-transition-output" id="cycle-result" aria-live="polite">
      La transición permanecerá oculta hasta comprobar la predicción.
    </div>
  `;

  body.querySelector(".didactic-check").addEventListener("click", () => {
    const reward = body.querySelector("#cycle-reward").value;
    const nextState = body.querySelector("#cycle-next-state").value;
    const qCell = body.querySelector("#cycle-q-cell").value;
    const correct = reward === "8" && nextState === "medio" && qCell === "alto:bloquear";

    body.querySelector("#cycle-result").innerHTML = `
      <strong>${correct ? "Predicción correcta." : "Compara tu respuesta con el modelo."}</strong>
      <span>Riesgo alto → Bloquear → +8 → Riesgo medio.</span>
      <span>La experiencia actualiza únicamente Q(alto, bloquear).</span>
      <span>Como no es una terminación natural, el objetivo conserva el valor futuro.</span>
    `;

    if (correct) {
      completeActivity(section, "ciclo", "cycle-prediction");
    }
  });

  insertActivity(root, section);
}

function mountQCalculator(root) {
  const section = createActivity({
    id: "didactic-q-calculator",
    eyebrow: "Cálculo guiado",
    title: "Completa una actualización Q-learning",
    description:
      "Calcula el objetivo TD, el error TD y el nuevo valor de la celda antes de comparar configuraciones de alpha.",
  });

  const body = section.querySelector(".didactic-activity-body");
  body.innerHTML = `
    <div class="didactic-q-inputs">
      <label>Q actual <input id="q-current" type="number" step="0.1" value="4"></label>
      <label>Recompensa <input id="q-reward" type="number" step="0.1" value="8"></label>
      <label>Mejor Q futuro <input id="q-future" type="number" step="0.1" value="6"></label>
      <label>Alpha <input id="q-alpha" type="number" min="0.1" max="1" step="0.1" value="0.5"></label>
      <label>Gamma <input id="q-gamma" type="number" min="0" max="0.9" step="0.1" value="0.8"></label>
    </div>

    <div class="didactic-q-answers">
      <label>Objetivo TD <input id="q-target-answer" type="number" step="0.01"></label>
      <label>Error TD <input id="q-error-answer" type="number" step="0.01"></label>
      <label>Nuevo Q <input id="q-updated-answer" type="number" step="0.01"></label>
    </div>

    <button class="button didactic-check" type="button">Comprobar cálculo</button>
    <p class="didactic-result" role="status"></p>
    <div class="didactic-alpha-comparison" id="q-alpha-comparison"></div>
  `;

  body.querySelector(".didactic-check").addEventListener("click", () => {
    const parameters = {
      currentQ: Number(body.querySelector("#q-current").value),
      reward: Number(body.querySelector("#q-reward").value),
      bestFutureQ: Number(body.querySelector("#q-future").value),
      alpha: Number(body.querySelector("#q-alpha").value),
      gamma: Number(body.querySelector("#q-gamma").value),
    };
    const expected = qLearningUpdate(parameters);
    const answers = [
      Number(body.querySelector("#q-target-answer").value),
      Number(body.querySelector("#q-error-answer").value),
      Number(body.querySelector("#q-updated-answer").value),
    ];
    const expectedValues = [expected.target, expected.tdError, expected.updated];
    const correct = answers.every(
      (answer, index) =>
        Number.isFinite(answer) &&
        Math.abs(answer - expectedValues[index]) <= 0.011,
    );

    body.querySelector(".didactic-result").textContent = correct
      ? `Correcto: objetivo ${formatNumber(expected.target)}, error ${formatNumber(expected.tdError)} y nuevo Q ${formatNumber(expected.updated)}.`
      : `Resultado esperado: objetivo ${formatNumber(expected.target)}, error ${formatNumber(expected.tdError)} y nuevo Q ${formatNumber(expected.updated)}.`;

    body.querySelector("#q-alpha-comparison").innerHTML = `
      <h4>La misma experiencia con distintos valores de alpha</h4>
      <div class="didactic-alpha-grid">
        ${[0.1, 0.5, 1].map((alpha) => {
          const result = qLearningUpdate({ ...parameters, alpha });
          return `
            <article>
              <span>α = ${formatNumber(alpha, 1)}</span>
              <strong>Q nuevo = ${formatNumber(result.updated, 2)}</strong>
            </article>
          `;
        }).join("")}
      </div>
    `;

    if (correct) {
      completeActivity(section, "q-learning", "q-calculator");
    }
  });

  insertActivity(root, section);
}

function sumMetrics(history) {
  const metrics = Object.fromEntries(metricOrder.map((metric) => [metric, 0]));

  history.forEach((experience) => {
    const outcome = getOutcome(experience.state, experience.action);
    metricOrder.forEach((metric) => {
      metrics[metric] += Number(outcome.metrics[metric] ?? 0);
    });
  });

  return metrics;
}

function mountSimulatorComparator(root, context) {
  const section = createActivity({
    id: "didactic-policy-comparator",
    eyebrow: "Comparación de estrategias",
    title: "Repite el segmento con otras políticas",
    description:
      "Compara las últimas cinco decisiones del simulador con una política aleatoria, una regla fija y la política greedy de la tabla Q.",
  });

  const body = section.querySelector(".didactic-activity-body");
  body.innerHTML = `
    <button class="button" id="policy-compare-button" type="button">Comparar políticas</button>
    <p class="didactic-result" id="policy-compare-status" role="status">
      Completa cinco decisiones en el simulador para incluir tu recorrido.
    </p>
    <div class="didactic-policy-table-wrap" id="policy-compare-output"></div>
  `;

  body.querySelector("#policy-compare-button").addEventListener("click", () => {
    const qStore = context?.qStore;
    const output = body.querySelector("#policy-compare-output");
    const status = body.querySelector("#policy-compare-status");

    if (!qStore) {
      status.textContent =
        "No se recibió el contexto compartido. Verifica el parche de src/app.js descrito en el manual.";
      return;
    }

    const snapshot = qStore.getSnapshot();
    const simulatorHistory = snapshot.history
      .filter((experience) => experience.source === "simulator")
      .slice(-5);

    const random = createSeededRandom(20260710);
    const policies = [];

    if (simulatorHistory.length === 5) {
      policies.push({
        name: "Tu recorrido",
        reward: simulatorHistory.reduce(
          (total, experience) => total + Number(experience.reward),
          0,
        ),
        metrics: sumMetrics(simulatorHistory),
        history: simulatorHistory,
      });
    }

    const fixedRule = {
      bajo: "permitir",
      medio: "observar",
      alto: "bloquear",
    };

    policies.push({
      name: "Política aleatoria",
      ...simulatePolicy({
        initialState: "alto",
        steps: 5,
        chooseAction: () =>
          actionOrder[Math.floor(random() * actionOrder.length)],
        getOutcome,
        metricOrder,
      }),
    });

    policies.push({
      name: "Regla fija prudente",
      ...simulatePolicy({
        initialState: "alto",
        steps: 5,
        chooseAction: (state) => fixedRule[state],
        getOutcome,
        metricOrder,
      }),
    });

    policies.push({
      name: "Política greedy Q",
      ...simulatePolicy({
        initialState: "alto",
        steps: 5,
        chooseAction: (state) => snapshot.policy[state].actions[0],
        getOutcome,
        metricOrder,
      }),
    });

    output.innerHTML = `
      <div class="didactic-model-table-wrap">
        <table class="didactic-policy-table">
          <caption>Comparación sobre un segmento de cinco decisiones</caption>
          <thead>
            <tr>
              <th>Política</th>
              <th>Recompensa</th>
              <th>Riesgo alto no contenido</th>
              <th>Bloqueos legítimos</th>
              <th>Impactos de disponibilidad</th>
              <th>Alertas innecesarias</th>
            </tr>
          </thead>
          <tbody>
            ${policies.map((policy) => `
              <tr>
                <th>${policy.name}</th>
                <td>${formatSigned(policy.reward)}</td>
                <td>${policy.metrics.highRiskUncontained}</td>
                <td>${policy.metrics.legitimateEventsBlocked}</td>
                <td>${policy.metrics.availabilityImpacts}</td>
                <td>${policy.metrics.unnecessaryAlerts}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="didactic-policy-paths">
        ${policies.map((policy) => `
          <article>
            <h4>${policy.name}</h4>
            <ol>
              ${policy.history.map((experience) => `
                <li>
                  ${stateDefinitions[experience.state].label}
                  → ${actionDefinitions[experience.action].label}
                  → ${formatSigned(experience.reward)}
                </li>
              `).join("")}
            </ol>
          </article>
        `).join("")}
      </div>
      <p class="didactic-comparison-note">
        Una recompensa total alta no reemplaza las métricas auxiliares. Revisa qué errores específicos
        produjo cada estrategia.
      </p>
    `;

    status.textContent = simulatorHistory.length === 5
      ? "Comparación completada con tus últimas cinco decisiones."
      : "Se compararon las políticas automáticas. Completa cinco decisiones para añadir tu recorrido.";

    if (simulatorHistory.length === 5) {
      completeActivity(section, "simulador", "policy-comparator");
    }
  });

  insertActivity(root, section);
}

const MOUNTERS = {
  proposito: (root) => mountPurpose(root),
  "que-es-rl": (root) => mountReturnCalculator(root),
  comparacion: (root) => mountComparisonGame(root),
  "caso-practico": (root) => mountNetworkLab(root),
  conceptos: (root) => mountTransitionBuilder(root),
  modelado: (root) => mountRewardEditor(root),
  ciclo: (root) => mountCyclePrediction(root),
  "q-learning": (root) => mountQCalculator(root),
  simulador: (root, context) => mountSimulatorComparator(root, context),
};

function mountEnhancement(slide, root, context = null) {
  if (!slide || !root || !MOUNTERS[slide]) return;

  const activityId = {
    proposito: "didactic-purpose-diagnostic",
    "que-es-rl": "didactic-return-calculator",
    comparacion: "didactic-approach-classifier",
    "caso-practico": "didactic-network-lab",
    conceptos: "didactic-transition-builder",
    modelado: "didactic-reward-editor",
    ciclo: "didactic-cycle-prediction",
    "q-learning": "didactic-q-calculator",
    simulador: "didactic-policy-comparator",
  }[slide];

  if (root.querySelector(`#${activityId}`)) return;

  MOUNTERS[slide](root, context);
}

function inferSlide() {
  return window.location.hash.slice(1) || "proposito";
}

function tryMountFromDom() {
  const host = document.querySelector("#slide-host");
  if (!host || host.getAttribute("aria-busy") === "true") return;

  const slide = inferSlide();
  latestSlide = slide;
  markVisited(slide);
  mountEnhancement(slide, host, latestContext);
}

window.addEventListener("rl:component-mounted", (event) => {
  const { slide, host, componentContext } = event.detail ?? {};
  latestContext = componentContext ?? latestContext;
  latestSlide = slide ?? inferSlide();
  const sequence = ++mountSequence;

  queueMicrotask(() => {
    if (sequence !== mountSequence) return;
    markVisited(latestSlide);
    mountEnhancement(latestSlide, host ?? document.querySelector("#slide-host"), latestContext);
  });
});

const host = document.querySelector("#slide-host");

if (host) {
  const observer = new MutationObserver(() => {
    window.setTimeout(tryMountFromDom, 0);
  });

  observer.observe(host, { childList: true });
}

window.addEventListener("hashchange", () => {
  window.setTimeout(tryMountFromDom, 0);
});

ensureProgressPanel();
renderProgressPanel();
window.setTimeout(tryMountFromDom, 0);
