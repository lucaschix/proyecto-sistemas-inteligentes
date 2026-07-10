const ROWS = 6;
const COLUMNS = 6;
const MAX_STEPS = 40;
const OPTIMAL_STEPS = 14;

export const DELIVERY_ACTIONS = Object.freeze({
  up: { label: "Arriba", row: -1, column: 0, symbol: "↑" },
  right: { label: "Derecha", row: 0, column: 1, symbol: "→" },
  down: { label: "Abajo", row: 1, column: 0, symbol: "↓" },
  left: { label: "Izquierda", row: 0, column: -1, symbol: "←" },
});

const ACTION_KEYS = Object.keys(DELIVERY_ACTIONS);
const START = Object.freeze({ row: 5, column: 0 });
const PACKAGE = Object.freeze({ row: 1, column: 1 });
const DESTINATION = Object.freeze({ row: 0, column: 5 });

const OBSTACLES = new Set([
  "0:2",
  "1:2",
  "1:4",
  "2:4",
  "3:0",
  "3:1",
  "4:3",
  "5:1",
]);

export function createInitialDeliveryState() {
  return {
    row: START.row,
    column: START.column,
    carrying: false,
  };
}

export function encodeDeliveryState(state) {
  return `${state.row}:${state.column}:${state.carrying ? 1 : 0}`;
}

export function isObstacle(row, column) {
  return OBSTACLES.has(`${row}:${column}`);
}

export function transitionDelivery(state, actionKey) {
  const action = DELIVERY_ACTIONS[actionKey];

  if (!action) {
    throw new Error(`Acción desconocida: ${actionKey}`);
  }

  let nextRow = state.row + action.row;
  let nextColumn = state.column + action.column;
  let reward = -1;
  let collision = false;
  let event = "Movimiento válido.";

  const outside =
    nextRow < 0 ||
    nextRow >= ROWS ||
    nextColumn < 0 ||
    nextColumn >= COLUMNS;

  if (outside || isObstacle(nextRow, nextColumn)) {
    nextRow = state.row;
    nextColumn = state.column;
    reward = -5;
    collision = true;
    event = "Colisión: el robot permanece en la misma posición.";
  }

  let carrying = state.carrying;
  let pickedPackage = false;
  let delivered = false;

  if (!collision && !carrying && nextRow === PACKAGE.row && nextColumn === PACKAGE.column) {
    carrying = true;
    pickedPackage = true;
    reward += 12;
    event = "Paquete recogido. Ahora debe llegar al destino.";
  }

  if (!collision && carrying && nextRow === DESTINATION.row && nextColumn === DESTINATION.column) {
    delivered = true;
    reward += 35;
    event = "Entrega completada.";
  }

  return {
    nextState: {
      row: nextRow,
      column: nextColumn,
      carrying,
    },
    reward,
    collision,
    pickedPackage,
    terminated: delivered,
    event,
  };
}

function ensureQValues(qTable, state) {
  const key = typeof state === "string" ? state : encodeDeliveryState(state);

  if (!qTable.has(key)) {
    qTable.set(key, [0, 0, 0, 0]);
  }

  return qTable.get(key);
}

function bestActionIndex(values, random = Math.random) {
  const maximum = Math.max(...values);
  const candidates = values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => Math.abs(value - maximum) < 1e-9)
    .map(({ index }) => index);

  return candidates[Math.floor(random() * candidates.length)];
}

function chooseActionIndex(values, epsilon, random) {
  if (random() < epsilon) {
    return Math.floor(random() * ACTION_KEYS.length);
  }

  return bestActionIndex(values, random);
}

export function createSeededRandom(seed = 20260710) {
  let value = seed >>> 0;

  return function seededRandom() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function runDeliveryTrainingEpisode(
  qTable,
  {
    alpha = 0.5,
    gamma = 0.9,
    epsilon = 0.2,
    random = Math.random,
    maxSteps = MAX_STEPS,
  } = {},
) {
  let state = createInitialDeliveryState();
  let rewardSum = 0;
  let collisions = 0;

  for (let step = 1; step <= maxSteps; step += 1) {
    const values = ensureQValues(qTable, state);
    const actionIndex = chooseActionIndex(values, epsilon, random);
    const actionKey = ACTION_KEYS[actionIndex];
    const outcome = transitionDelivery(state, actionKey);
    const nextValues = ensureQValues(qTable, outcome.nextState);

    const target = outcome.terminated
      ? outcome.reward
      : outcome.reward + gamma * Math.max(...nextValues);

    values[actionIndex] += alpha * (target - values[actionIndex]);

    rewardSum += outcome.reward;
    collisions += Number(outcome.collision);
    state = outcome.nextState;

    if (outcome.terminated) {
      return {
        delivered: true,
        steps: step,
        collisions,
        reward: rewardSum,
      };
    }
  }

  return {
    delivered: false,
    steps: maxSteps,
    collisions,
    reward: rewardSum,
  };
}

export function evaluateDeliveryPolicy(qTable, { maxSteps = MAX_STEPS } = {}) {
  let state = createInitialDeliveryState();
  let rewardSum = 0;
  let collisions = 0;
  const path = [{ ...state }];

  for (let step = 1; step <= maxSteps; step += 1) {
    const values = ensureQValues(qTable, state);
    const actionIndex = bestActionIndex(values, () => 0);
    const actionKey = ACTION_KEYS[actionIndex];
    const outcome = transitionDelivery(state, actionKey);

    rewardSum += outcome.reward;
    collisions += Number(outcome.collision);
    state = outcome.nextState;
    path.push({ ...state });

    if (outcome.terminated) {
      return {
        delivered: true,
        steps: step,
        collisions,
        reward: rewardSum,
        path,
      };
    }
  }

  return {
    delivered: false,
    steps: maxSteps,
    collisions,
    reward: rewardSum,
    path,
  };
}

function formatDecimal(value, digits = 2) {
  return Number(value).toLocaleString("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatSigned(value) {
  return `${value > 0 ? "+" : ""}${value}`;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export function mount(root, { createChallenge }) {
  const qTable = new Map();
  const actionButtons = Array.from(root.querySelectorAll("[data-delivery-action]"));
  const stageItems = Array.from(root.querySelectorAll("[data-delivery-stage]"));

  const board = root.querySelector("#delivery-board");
  const modeOutput = root.querySelector("#delivery-mode");
  const stepOutput = root.querySelector("#delivery-step");
  const rewardOutput = root.querySelector("#delivery-reward");
  const collisionOutput = root.querySelector("#delivery-collisions");
  const positionOutput = root.querySelector("#delivery-position");
  const packageOutput = root.querySelector("#delivery-package-state");
  const lastEventOutput = root.querySelector("#delivery-last-event");
  const statusBadge = root.querySelector("#delivery-status-badge");
  const log = root.querySelector("#delivery-log");
  const policyNote = root.querySelector("#delivery-policy-note");
  const qStateLabel = root.querySelector("#delivery-q-state");

  const alphaInput = root.querySelector("#delivery-alpha");
  const gammaInput = root.querySelector("#delivery-gamma");
  const epsilonInput = root.querySelector("#delivery-epsilon");
  const episodesInput = root.querySelector("#delivery-episodes");
  const alphaOutput = root.querySelector("#delivery-alpha-value");
  const gammaOutput = root.querySelector("#delivery-gamma-value");
  const epsilonOutput = root.querySelector("#delivery-epsilon-value");
  const episodesOutput = root.querySelector("#delivery-episodes-value");

  const trainButton = root.querySelector("#delivery-train");
  const clearLearningButton = root.querySelector("#delivery-clear-learning");
  const manualButton = root.querySelector("#delivery-manual-mode");
  const agentDemoButton = root.querySelector("#delivery-agent-demo");
  const resetAllButton = root.querySelector("#delivery-reset-all");
  const progress = root.querySelector("#delivery-training-progress");
  const trainingStatus = root.querySelector("#delivery-training-status");
  const trainedEpisodesOutput = root.querySelector("#delivery-trained-episodes");
  const trainingSuccessOutput = root.querySelector("#delivery-training-success");
  const visitedStatesOutput = root.querySelector("#delivery-visited-states");
  const greedyStepsOutput = root.querySelector("#delivery-greedy-steps");

  let mode = "manual";
  let state = createInitialDeliveryState();
  let steps = 0;
  let rewardSum = 0;
  let collisions = 0;
  let episodeEnded = false;
  let trail = [encodeDeliveryState(state).split(":").slice(0, 2).join(":")];
  let events = [];
  let manualResult = null;
  let agentResult = null;
  let trainedEpisodes = 0;
  let successfulTrainingEpisodes = 0;
  let trainingRuns = 0;
  let destroyed = false;
  let animationToken = 0;

  function setStage(stage) {
    stageItems.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.deliveryStage === stage);
    });
  }

  function currentStatus() {
    if (episodeEnded) {
      return state.row === DESTINATION.row && state.column === DESTINATION.column
        ? { label: "Entrega completada", status: "delivered" }
        : { label: "Límite alcanzado", status: "failed" };
    }

    if (state.carrying) {
      return { label: "Transportando paquete", status: "carrying" };
    }

    return { label: "Busca el paquete", status: "searching" };
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();
    const visited = new Set(trail);

    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const cell = document.createElement("div");
        const coordinate = `${row}:${column}`;
        const obstacle = isObstacle(row, column);
        const hasRobot = state.row === row && state.column === column;
        const hasPackage =
          !state.carrying &&
          !episodeEnded &&
          PACKAGE.row === row &&
          PACKAGE.column === column;
        const destination =
          DESTINATION.row === row &&
          DESTINATION.column === column;

        cell.className = "delivery-cell";
        cell.setAttribute("role", "gridcell");

        if (obstacle) cell.classList.add("is-obstacle");
        if (hasPackage) cell.classList.add("is-package");
        if (destination) cell.classList.add("is-destination");
        if (visited.has(coordinate) && !hasRobot) cell.classList.add("is-trail");

        const labels = [`Fila ${row + 1}, columna ${column + 1}`];

        if (obstacle) labels.push("obstáculo");
        if (hasPackage) labels.push("paquete");
        if (destination) labels.push("destino");
        if (hasRobot) labels.push(state.carrying ? "robot transportando paquete" : "robot");

        cell.setAttribute("aria-label", labels.join(", "));

        if (destination) {
          const destinationIcon = document.createElement("span");
          destinationIcon.className = "delivery-destination";
          destinationIcon.setAttribute("aria-hidden", "true");
          cell.append(destinationIcon);
        }

        if (hasPackage) {
          const packageIcon = document.createElement("span");
          packageIcon.className = "delivery-package";
          packageIcon.setAttribute("aria-hidden", "true");
          cell.append(packageIcon);
        }

        if (hasRobot) {
          const robotIcon = document.createElement("span");
          robotIcon.className = `delivery-robot${state.carrying ? " is-carrying" : ""}`;
          robotIcon.setAttribute("aria-hidden", "true");
          cell.append(robotIcon);
        }

        fragment.append(cell);
      }
    }

    board.replaceChildren(fragment);
  }

  function renderQValues() {
    const values = ensureQValues(qTable, state);
    const maximumAbsolute = Math.max(1, ...values.map((value) => Math.abs(value)));
    const maximum = Math.max(...values);
    const hasLearning = trainedEpisodes > 0;

    root.querySelectorAll("[data-q-action]").forEach((row, index) => {
      const value = values[index];
      const width = hasLearning ? Math.max(3, (Math.abs(value) / maximumAbsolute) * 100) : 0;
      const fill = row.querySelector(".q-bar-fill");

      fill.style.width = `${width}%`;
      row.querySelector("output").textContent = formatDecimal(value);
      row.classList.toggle("is-negative", value < 0);
      row.classList.toggle(
        "is-best",
        hasLearning && Math.abs(value - maximum) < 1e-9,
      );
    });

    qStateLabel.textContent = hasLearning
      ? `Estado ${encodeDeliveryState(state)}`
      : "Sin entrenamiento";

    if (!hasLearning) {
      policyNote.textContent =
        "Entrena al agente para observar qué acción obtiene el mayor valor Q.";
      return;
    }

    const bestIndex = bestActionIndex(values, () => 0);
    policyNote.textContent =
      `Política greedy sugerida: ${DELIVERY_ACTIONS[ACTION_KEYS[bestIndex]].label}.`;
  }

  function renderLog() {
    if (events.length === 0) {
      log.innerHTML = "<li>El historial aparecerá después del primer movimiento.</li>";
      return;
    }

    log.innerHTML = events
      .slice(-6)
      .reverse()
      .map((event) => `<li>${event}</li>`)
      .join("");
  }

  function renderComparison() {
    const humanCells = {
      success: root.querySelector("#delivery-human-success"),
      steps: root.querySelector("#delivery-human-steps"),
      collisions: root.querySelector("#delivery-human-collisions"),
      reward: root.querySelector("#delivery-human-reward"),
    };

    const agentCells = {
      success: root.querySelector("#delivery-agent-success"),
      steps: root.querySelector("#delivery-agent-steps"),
      collisions: root.querySelector("#delivery-agent-collisions"),
      reward: root.querySelector("#delivery-agent-reward"),
    };

    if (manualResult) {
      humanCells.success.textContent = manualResult.delivered ? "Sí" : "No";
      humanCells.steps.textContent = manualResult.steps;
      humanCells.collisions.textContent = manualResult.collisions;
      humanCells.reward.textContent = formatSigned(manualResult.reward);
    } else {
      humanCells.success.textContent = "Sin intento";
      humanCells.steps.textContent = "—";
      humanCells.collisions.textContent = "—";
      humanCells.reward.textContent = "—";
    }

    if (agentResult) {
      agentCells.success.textContent = agentResult.delivered ? "Sí" : "No";
      agentCells.steps.textContent = agentResult.steps;
      agentCells.collisions.textContent = agentResult.collisions;
      agentCells.reward.textContent = formatSigned(agentResult.reward);
    } else {
      agentCells.success.textContent = trainedEpisodes > 0 ? "No convergió" : "Sin entrenar";
      agentCells.steps.textContent = "—";
      agentCells.collisions.textContent = "—";
      agentCells.reward.textContent = "—";
    }

    const insight = root.querySelector("#delivery-comparison-insight");

    if (!manualResult || !agentResult) {
      insight.textContent =
        "Completa un intento manual y entrena al agente para habilitar la comparación.";
      return;
    }

    if (manualResult.delivered && agentResult.delivered) {
      const difference = manualResult.steps - agentResult.steps;

      if (difference > 0) {
        insight.textContent =
          `La política aprendida utilizó ${difference} paso${difference === 1 ? "" : "s"} menos que tu recorrido.`;
      } else if (difference < 0) {
        insight.textContent =
          `Tu recorrido utilizó ${Math.abs(difference)} paso${difference === -1 ? "" : "s"} menos que la política aprendida.`;
      } else {
        insight.textContent =
          "Ambas políticas completaron la entrega con la misma cantidad de pasos.";
      }

      return;
    }

    insight.textContent =
      "Una de las políticas no completó la entrega. Revisa las colisiones, la exploración y la cantidad de episodios.";
  }

  function render() {
    const status = currentStatus();

    modeOutput.textContent =
      mode === "manual"
        ? "Control manual"
        : mode === "training"
          ? "Entrenamiento"
          : "Agente Q-learning";

    stepOutput.value = steps;
    rewardOutput.value = formatSigned(rewardSum);
    collisionOutput.value = collisions;
    positionOutput.textContent = `Fila ${state.row + 1}, columna ${state.column + 1}`;
    packageOutput.textContent = state.carrying
      ? "En transporte"
      : episodeEnded
        ? "No entregado"
        : "Pendiente de recoger";

    statusBadge.textContent = status.label;
    statusBadge.dataset.status = status.status;

    actionButtons.forEach((button) => {
      button.disabled = mode !== "manual" || episodeEnded;
    });

    renderBoard();
    renderQValues();
    renderLog();
    renderComparison();
  }

  function recordEvent(actionKey, outcome) {
    const action = DELIVERY_ACTIONS[actionKey];
    events.push(
      `Paso ${steps}: ${action.label}; recompensa ${formatSigned(outcome.reward)}. ${outcome.event}`,
    );
  }

  function finishEpisode(resultSource) {
    episodeEnded = true;

    const result = {
      delivered:
        state.row === DESTINATION.row &&
        state.column === DESTINATION.column &&
        state.carrying,
      steps,
      collisions,
      reward: rewardSum,
    };

    if (resultSource === "manual") {
      manualResult = result;
    } else {
      agentResult = result;
    }

    setStage("comparison");
  }

  function applyAction(actionKey, resultSource) {
    if (episodeEnded) return null;

    const outcome = transitionDelivery(state, actionKey);
    state = outcome.nextState;
    steps += 1;
    rewardSum += outcome.reward;
    collisions += Number(outcome.collision);
    trail.push(`${state.row}:${state.column}`);
    lastEventOutput.textContent = outcome.event;
    recordEvent(actionKey, outcome);

    if (outcome.terminated || steps >= MAX_STEPS) {
      if (!outcome.terminated && steps >= MAX_STEPS) {
        lastEventOutput.textContent =
          "El episodio fue truncado al alcanzar 40 pasos.";
        events.push("El episodio fue truncado al alcanzar el límite de pasos.");
      }

      finishEpisode(resultSource);
    }

    render();
    return outcome;
  }

  function resetEpisode(nextMode = "manual") {
    animationToken += 1;
    mode = nextMode;
    state = createInitialDeliveryState();
    steps = 0;
    rewardSum = 0;
    collisions = 0;
    episodeEnded = false;
    trail = [`${state.row}:${state.column}`];
    events = [];
    lastEventOutput.textContent =
      nextMode === "manual"
        ? "El episodio aún no comienza."
        : "La política greedy está lista para actuar.";

    setStage(nextMode === "manual" ? "manual" : "comparison");
    render();
  }

  function renderTrainingMetrics() {
    const successRate =
      trainedEpisodes === 0
        ? 0
        : (successfulTrainingEpisodes / trainedEpisodes) * 100;

    trainedEpisodesOutput.value = trainedEpisodes;
    trainingSuccessOutput.value = `${formatDecimal(successRate, 1)} %`;
    visitedStatesOutput.value = qTable.size;

    const evaluation = trainedEpisodes > 0 ? evaluateDeliveryPolicy(qTable) : null;
    agentResult = evaluation?.delivered ? evaluation : null;
    greedyStepsOutput.value = agentResult ? agentResult.steps : "—";
    agentDemoButton.disabled = !agentResult;

    renderComparison();
    renderQValues();
  }

  async function trainAgent() {
    if (mode === "training") return;

    const token = ++animationToken;
    mode = "training";
    setStage("training");

    const episodes = Number(episodesInput.value);
    const alpha = Number(alphaInput.value);
    const gamma = Number(gammaInput.value);
    const epsilon = Number(epsilonInput.value);
    const random = createSeededRandom(20260710 + trainingRuns);
    trainingRuns += 1;

    progress.max = episodes;
    progress.value = 0;
    trainButton.disabled = true;
    clearLearningButton.disabled = true;
    agentDemoButton.disabled = true;
    actionButtons.forEach((button) => {
      button.disabled = true;
    });

    trainingStatus.textContent =
      `Entrenando ${episodes} episodios con α=${formatDecimal(alpha, 1)}, ` +
      `γ=${formatDecimal(gamma, 2)} y ε=${formatDecimal(epsilon, 2)}.`;

    const batchSize = 25;
    let runSuccesses = 0;

    for (let index = 0; index < episodes; index += 1) {
      if (destroyed || token !== animationToken) return;

      const result = runDeliveryTrainingEpisode(qTable, {
        alpha,
        gamma,
        epsilon,
        random,
      });

      runSuccesses += Number(result.delivered);

      if ((index + 1) % batchSize === 0 || index === episodes - 1) {
        progress.value = index + 1;
        trainingStatus.textContent =
          `Procesados ${index + 1} de ${episodes} episodios.`;
        await nextFrame();
      }
    }

    if (destroyed || token !== animationToken) return;

    trainedEpisodes += episodes;
    successfulTrainingEpisodes += runSuccesses;
    mode = "manual";
    setStage("comparison");

    trainingStatus.textContent =
      `Entrenamiento completado: ${runSuccesses} entregas exitosas en ` +
      `${episodes} episodios. Ya puedes observar la política greedy.`;

    trainButton.disabled = false;
    clearLearningButton.disabled = false;
    renderTrainingMetrics();
    render();
  }

  async function playAgent() {
    if (!agentResult || mode === "training") return;

    resetEpisode("agent");
    mode = "agent";
    setStage("comparison");
    render();

    const token = ++animationToken;

    while (!episodeEnded && token === animationToken && !destroyed) {
      const values = ensureQValues(qTable, state);
      const actionIndex = bestActionIndex(values, () => 0);
      const actionKey = ACTION_KEYS[actionIndex];

      applyAction(actionKey, "agent");

      if (!episodeEnded) {
        await new Promise((resolve) => window.setTimeout(resolve, 360));
      }
    }

    if (!destroyed && token === animationToken) {
      mode = "manual";
      render();
    }
  }

  function clearLearning() {
    animationToken += 1;
    mode = "manual";
    trainButton.disabled = false;
    clearLearningButton.disabled = false;
    qTable.clear();
    trainedEpisodes = 0;
    successfulTrainingEpisodes = 0;
    trainingRuns = 0;
    agentResult = null;
    progress.value = 0;
    trainingStatus.textContent = "El aprendizaje fue borrado.";
    agentDemoButton.disabled = true;
    renderTrainingMetrics();
    render();
  }

  function resetAll() {
    clearLearning();
    manualResult = null;
    alphaInput.value = "0.5";
    gammaInput.value = "0.9";
    epsilonInput.value = "0.2";
    episodesInput.value = "500";
    updateParameterLabels();
    resetEpisode("manual");
    trainingStatus.textContent = "El laboratorio volvió a su estado inicial.";
  }

  function updateParameterLabels() {
    alphaOutput.value = formatDecimal(alphaInput.value, 1);
    gammaOutput.value = formatDecimal(gammaInput.value, 2);
    epsilonOutput.value = formatDecimal(epsilonInput.value, 2);
    episodesOutput.value = episodesInput.value;
    trainButton.textContent = `Entrenar ${episodesInput.value} episodios`;
  }

  function handleKeyboard(event) {
    if (mode !== "manual" || episodeEnded) return;

    const activeTag = document.activeElement?.tagName;
    if (activeTag === "INPUT" || activeTag === "BUTTON" || activeTag === "SELECT") {
      return;
    }

    const keyMap = {
      ArrowUp: "up",
      w: "up",
      W: "up",
      ArrowRight: "right",
      d: "right",
      D: "right",
      ArrowDown: "down",
      s: "down",
      S: "down",
      ArrowLeft: "left",
      a: "left",
      A: "left",
    };

    const actionKey = keyMap[event.key];

    if (!actionKey) return;

    event.preventDefault();
    applyAction(actionKey, "manual");
  }

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyAction(button.dataset.deliveryAction, "manual");
    });
  });

  [alphaInput, gammaInput, epsilonInput, episodesInput].forEach((input) => {
    input.addEventListener("input", updateParameterLabels);
  });

  trainButton.addEventListener("click", trainAgent);
  clearLearningButton.addEventListener("click", clearLearning);
  manualButton.addEventListener("click", () => resetEpisode("manual"));
  agentDemoButton.addEventListener("click", playAgent);
  resetAllButton.addEventListener("click", resetAll);
  document.addEventListener("keydown", handleKeyboard);

  createChallenge(root, {
    question:
      "¿Por qué se aplica una recompensa de −1 incluso cuando el robot realiza un movimiento válido?",
    options: [
      {
        label: "Para favorecer rutas que completen la entrega con menos pasos",
        correct: true,
        feedback:
          "Dos rutas pueden entregar el paquete, pero el costo por movimiento permite valorar mejor la más corta.",
      },
      {
        label: "Para impedir que el agente recoja el paquete",
        correct: false,
        feedback:
          "Recoger el paquete entrega una recompensa positiva y es necesario para completar la tarea.",
      },
      {
        label: "Para convertir cada movimiento en una terminación natural",
        correct: false,
        feedback:
          "Los movimientos intermedios no terminan el episodio; el agente continúa hasta entregar o alcanzar el límite.",
      },
    ],
  });

  updateParameterLabels();
  renderTrainingMetrics();
  resetEpisode("manual");

  return () => {
    destroyed = true;
    animationToken += 1;
    document.removeEventListener("keydown", handleKeyboard);
  };
}
