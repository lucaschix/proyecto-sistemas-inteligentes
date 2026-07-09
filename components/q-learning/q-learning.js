import {
  actionDefinitions,
  getOutcome,
  stateDefinitions
} from "../rl-model.js";

function renderTable(root, snapshot, changedCells = [], onSelect) {
  const tbody = root.querySelector(".q-table tbody");
  tbody.innerHTML = "";

  snapshot.states.forEach((state) => {
    const row = document.createElement("tr");
    const heading = document.createElement("th");
    heading.scope = "row";
    heading.textContent = stateDefinitions[state].label;
    row.append(heading);

    snapshot.actions.forEach((action) => {
      const cell = document.createElement("td");
      const button = document.createElement("button");
      const value = snapshot.values[state][action].toFixed(2);
      const visitCount = snapshot.visits[state][action];
      const isGreedy = snapshot.policy[state].actions.includes(action);

      button.className = "q-cell-button";
      button.type = "button";
      button.dataset.state = state;
      button.dataset.action = action;
      button.innerHTML = `
        <span class="q-cell-value">${value}</span>
        <small>${visitCount} ${visitCount === 1 ? "visita" : "visitas"}${isGreedy ? " · política greedy" : ""}</small>
      `;
      button.setAttribute(
        "aria-label",
        `Entrenar ${actionDefinitions[action].label} con ${stateDefinitions[state].label}. ` +
        `Valor Q ${value}, ${visitCount} ${visitCount === 1 ? "visita" : "visitas"}` +
        `${isGreedy ? ", acción de la política greedy actual" : ""}.`
      );
      button.addEventListener("click", () => onSelect(state, action));
      cell.append(button);

      if (changedCells.some((changed) => changed.state === state && changed.action === action)) {
        cell.classList.add("q-cell-updated");
      }
      if (isGreedy) cell.classList.add("q-cell-greedy");
      row.append(cell);
    });
    tbody.append(row);
  });
}

function renderPolicy(root, snapshot) {
  const policy = root.querySelector("#q-policy");
  policy.innerHTML = snapshot.states
    .map((state) => {
      const actions = snapshot.policy[state].actions
        .map((action) => actionDefinitions[action].label)
        .join(" / ");
      return `<li><strong>${stateDefinitions[state].label}:</strong> ${actions}</li>`;
    })
    .join("");
}

function renderHistory(root, snapshot) {
  root.querySelector("#q-history-count").textContent = snapshot.experienceCount;
  const visibleHistory = snapshot.history.slice(-50);
  root.querySelector("#q-history").innerHTML = visibleHistory
    .map((experience) => {
      const destination = experience.terminated
        ? "estado terminal"
        : stateDefinitions[experience.nextState].label;
      const ending = experience.truncated ? " · segmento truncado" : experience.terminated ? " · terminal" : "";
      const source = {
        example: "ejemplo",
        manual: "tabla",
        simulator: "simulador",
        test: "prueba"
      }[experience.source] ?? "experiencia";

      return (
        `<li><strong>${stateDefinitions[experience.state].label} · ` +
        `${actionDefinitions[experience.action].label}</strong> → ${destination}; ` +
        `recompensa proxy=${experience.reward} · ${source}${ending}</li>`
      );
    })
    .join("");
  const description = root.querySelector(".history-panel > p");
  description.textContent =
    snapshot.experienceCount > 50
      ? `Se muestran las últimas 50 de ${snapshot.experienceCount} experiencias, en el orden usado para reentrenar.`
      : "Orden usado para reentrenar la tabla cuando cambian alpha o gamma.";
}

export function mount(root, { qStore, uiStore, navigate, createChallenge }) {
  const alpha = root.querySelector("#alpha-control");
  const gamma = root.querySelector("#gamma-control");
  const alphaOutput = root.querySelector("#alpha-value");
  const gammaOutput = root.querySelector("#gamma-value");
  const status = root.querySelector("#q-status");
  const returnButton = root.querySelector("#return-simulator");
  let pendingFocus = null;
  let parameterTimer = null;

  function syncControls(snapshot) {
    alpha.value = snapshot.alpha;
    gamma.value = snapshot.gamma;
    alphaOutput.value = snapshot.alpha.toFixed(1);
    gammaOutput.value = snapshot.gamma.toFixed(1);
  }

  function updateParameterOutputs() {
    alphaOutput.value = Number(alpha.value).toFixed(1);
    gammaOutput.value = Number(gamma.value).toFixed(1);
  }

  function applyParameters() {
    window.clearTimeout(parameterTimer);
    parameterTimer = null;
    qStore.setParameters(alpha.value, gamma.value);
  }

  function onParameterInput() {
    updateParameterOutputs();
    window.clearTimeout(parameterTimer);
    parameterTimer = window.setTimeout(applyParameters, 180);
  }

  function trainCell(state, action) {
    const outcome = getOutcome(state, action);
    pendingFocus = { state, action };
    const detail = qStore.update({
      state,
      action,
      ...outcome,
      truncated: false,
      source: "manual"
    });
    const parts = outcome.rewardParts;
    const futureText = detail.terminated
      ? "La transición es terminal: no se añadió valor futuro."
      : `Mejor valor Q futuro: ${detail.bestFuture.toFixed(2)}; objetivo TD: ${detail.target.toFixed(2)}.`;

    status.textContent =
      `${stateDefinitions[state].label}, ${actionDefinitions[action].label}: recompensa proxy ${outcome.reward > 0 ? "+" : ""}${outcome.reward} ` +
      `(seguridad ${parts.security}, disponibilidad ${parts.availability}, impacto operativo ${parts.operations}). ` +
      `El valor Q cambió de ${detail.current.toFixed(2)} a ${detail.updated.toFixed(2)}. ${futureText}`;
  }

  function describeChangedCells(changedCells) {
    if (changedCells.length === 0) return "Ninguna celda cambió.";
    return changedCells
      .map(
        ({ state, action, current, updated }) =>
          `${stateDefinitions[state].label} con ${actionDefinitions[action].label}: ` +
          `${current.toFixed(2)} → ${updated.toFixed(2)}`
      )
      .join("; ");
  }

  const initial = qStore.getSnapshot();
  syncControls(initial);
  renderTable(root, initial, [], trainCell);
  renderPolicy(root, initial);
  renderHistory(root, initial);
  status.textContent = `Tabla entrenada con ${initial.experienceCount} experiencias de ejemplo.`;

  alpha.addEventListener("input", onParameterInput);
  gamma.addEventListener("input", onParameterInput);
  alpha.addEventListener("change", applyParameters);
  gamma.addEventListener("change", applyParameters);
  root.querySelector("#reset-q").addEventListener("click", () => qStore.reset());
  if (uiStore.shouldReturnToSimulator()) {
    returnButton.hidden = false;
    returnButton.addEventListener("click", () => {
      uiStore.setReturnToSimulator(false);
      navigate("simulador", { focus: true });
    });
  }

  const unsubscribe = qStore.subscribe((snapshot, detail) => {
    syncControls(snapshot);
    const focusTarget = pendingFocus;
    renderTable(root, snapshot, detail.changedCells, trainCell);
    renderPolicy(root, snapshot);
    renderHistory(root, snapshot);

    if (focusTarget) {
      root
        .querySelector(`[data-state="${focusTarget.state}"][data-action="${focusTarget.action}"]`)
        ?.focus();
      pendingFocus = null;
    }

    if (detail.type === "update") {
      status.textContent =
        `El valor Q de ${stateDefinitions[detail.state].label} con ` +
        `${actionDefinitions[detail.action].label} cambió de ${detail.current.toFixed(2)} ` +
        `a ${detail.updated.toFixed(2)}.`;
    }
    if (detail.type === "parameters") {
      status.textContent =
        `Parámetros aplicados: alpha ${snapshot.alpha.toFixed(1)}, gamma ${snapshot.gamma.toFixed(1)}. ` +
        `Se reentrenaron ${snapshot.experienceCount} experiencias y cambiaron ${detail.changedCells.length} celdas.`;
    }
    if (detail.type === "reset") {
      status.textContent =
        `Aprendizaje restablecido a las seis experiencias iniciales. ` +
        describeChangedCells(detail.changedCells);
    }
  });

  createChallenge(root, {
    question: "¿Qué ocurre con el valor futuro en el quinto paso de este simulador?",
    options: [
      {
        label: "Se conserva porque el segmento se trunca, pero la tarea continúa",
        correct: true,
        feedback: "El siguiente estado sigue siendo válido, así que el objetivo TD mantiene el bootstrap."
      },
      {
        label: "Se elimina porque toda pausa es terminal",
        correct: false,
        feedback: "Un truncamiento por límite de pasos no equivale a una terminación natural."
      },
      {
        label: "Depende de si la recompensa es positiva",
        correct: false,
        feedback: "El signo de la recompensa no decide el bootstrap; lo decide la terminación natural."
      }
    ]
  });

  return () => {
    window.clearTimeout(parameterTimer);
    unsubscribe();
  };
}
