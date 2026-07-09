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
      const change = changedCells.find((changed) => changed.state === state && changed.action === action);
      const changeText = change ? ` · actualizada ${change.current.toFixed(2)} → ${change.updated.toFixed(2)}` : "";

      button.className = "q-cell-button";
      button.type = "button";
      button.dataset.state = state;
      button.dataset.action = action;
      button.innerHTML = `
        <span class="q-cell-value">${value}</span>
        <small>
          ${visitCount} ${visitCount === 1 ? "visita" : "visitas"}${isGreedy ? " · política greedy" : ""}${changeText}
        </small>
      `;
      button.setAttribute(
        "aria-label",
        `Entrenar ${actionDefinitions[action].label} con ${stateDefinitions[state].label}. ` +
        `Valor Q ${value}, ${visitCount} ${visitCount === 1 ? "visita" : "visitas"}` +
        `${isGreedy ? ", acción de la política greedy actual" : ""}` +
        `${change ? `, actualizada en este paso de ${change.current.toFixed(2)} a ${change.updated.toFixed(2)}` : ""}.`
      );
      button.addEventListener("click", () => onSelect(state, action));
      cell.append(button);

      if (change) cell.classList.add("q-cell-updated");
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

function formatSourceSummary(snapshot) {
  const labels = {
    example: "de ejemplo",
    table: "entrenadas desde la tabla",
    simulator: "desde el simulador"
  };

  return Object.entries(labels)
    .filter(([key]) => snapshot.sourceCounts[key] > 0)
    .map(([key, label]) => `${snapshot.sourceCounts[key]} ${label}`)
    .join(", ");
}

function renderHistory(root, snapshot) {
  root.querySelector("#q-history-count").textContent = snapshot.experienceCount;
  root.querySelector("#q-history-summary").textContent =
    snapshot.experienceCount > 0
      ? `Historial actual: ${formatSourceSummary(snapshot)}.`
      : "Todavía no hay experiencias registradas.";

  const visibleHistory = snapshot.history.slice(-50);
  root.querySelector("#q-history").innerHTML = visibleHistory
    .map((experience) => {
      const destination = experience.terminated
        ? "estado terminal"
        : stateDefinitions[experience.nextState].label;
      const ending = experience.truncated ? " · segmento truncado" : experience.terminated ? " · terminal" : "";
      const source = {
        example: "ejemplo",
        table: "tabla",
        simulator: "simulador"
      }[experience.source] ?? "experiencia";

      return (
        `<li><strong>${stateDefinitions[experience.state].label} · ` +
        `${actionDefinitions[experience.action].label}</strong> → ${destination}; ` +
        `recompensa proxy=${experience.reward} · <span class="history-source">origen: ${source}</span>${ending}</li>`
      );
    })
    .join("");

  const description = root.querySelector(".history-panel > p:last-of-type");
  description.textContent =
    snapshot.experienceCount > 50
      ? `Se muestran las últimas 50 de ${snapshot.experienceCount} experiencias, en el orden usado para reentrenar.`
      : "Orden usado para reentrenar la tabla cuando cambian alpha o gamma.";
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

export function mount(root, { qStore, uiStore, navigate, createChallenge }) {
  const alpha = root.querySelector("#alpha-control");
  const gamma = root.querySelector("#gamma-control");
  const alphaOutput = root.querySelector("#alpha-value");
  const gammaOutput = root.querySelector("#gamma-value");
  const status = root.querySelector("#q-status");
  const resetButton = root.querySelector("#reset-q");
  const returnButton = root.querySelector("#return-simulator");
  const alphaControl = alpha.closest(".range-control");
  const gammaControl = gamma.closest(".range-control");
  let pendingFocus = null;
  let parameterTimer = null;
  let resetArmed = false;

  function setStatus(message) {
    status.textContent = message;
  }

  function syncControls(snapshot) {
    alpha.value = snapshot.alpha;
    gamma.value = snapshot.gamma;
    alphaOutput.value = snapshot.alpha.toFixed(1);
    gammaOutput.value = snapshot.gamma.toFixed(1);
    alphaControl?.classList.remove("is-pending");
    gammaControl?.classList.remove("is-pending");
  }

  function updateParameterOutputs() {
    alphaOutput.value = Number(alpha.value).toFixed(1);
    gammaOutput.value = Number(gamma.value).toFixed(1);
  }

  function markParameterChanges() {
    const snapshot = qStore.getSnapshot();
    const nextAlpha = Number(alpha.value);
    const nextGamma = Number(gamma.value);
    const alphaChanged = nextAlpha !== snapshot.alpha;
    const gammaChanged = nextGamma !== snapshot.gamma;
    alphaControl?.classList.toggle("is-pending", alphaChanged);
    gammaControl?.classList.toggle("is-pending", gammaChanged);

    if (alphaChanged || gammaChanged) {
      setStatus(
        `Ajuste pendiente: alpha ${nextAlpha.toFixed(1)}, gamma ${nextGamma.toFixed(1)}. ` +
        "Se aplicará automáticamente y reentrenará el historial."
      );
    }
  }

  function disarmReset() {
    resetArmed = false;
    resetButton.textContent = "Restablecer historial y parámetros";
  }

  function applyParameters() {
    window.clearTimeout(parameterTimer);
    parameterTimer = null;
    disarmReset();
    const changed = qStore.setParameters(alpha.value, gamma.value);
    if (!changed) {
      alphaControl?.classList.remove("is-pending");
      gammaControl?.classList.remove("is-pending");
      setStatus(
        `Parámetros sin cambios: alpha ${Number(alpha.value).toFixed(1)}, gamma ${Number(gamma.value).toFixed(1)}.`
      );
    }
  }

  function onParameterInput() {
    updateParameterOutputs();
    window.clearTimeout(parameterTimer);
    markParameterChanges();
    parameterTimer = window.setTimeout(applyParameters, 180);
  }

  function trainCell(state, action) {
    const outcome = getOutcome(state, action);
    pendingFocus = { state, action };
    disarmReset();
    qStore.update({
      state,
      action,
      ...outcome,
      truncated: false,
      source: "table"
    });
  }

  function updateStatusFromDetail(snapshot, detail) {
    if (detail.type === "update") {
      const parts = detail.rewardParts;
      const futureText = detail.terminated
        ? "La transición es terminal: no se añadió valor futuro."
        : `Mejor valor Q futuro: ${detail.bestFuture.toFixed(2)}; objetivo TD: ${detail.target.toFixed(2)}.`;

      setStatus(
        `${stateDefinitions[detail.state].label}, ${actionDefinitions[detail.action].label}: recompensa proxy ` +
        `${detail.reward > 0 ? "+" : ""}${detail.reward} ` +
        `(seguridad ${parts.security}, disponibilidad ${parts.availability}, impacto operativo ${parts.operations}). ` +
        `El valor Q cambió de ${detail.current.toFixed(2)} a ${detail.updated.toFixed(2)}. ${futureText}`
      );
    }

    if (detail.type === "parameters") {
      const alphaChange = snapshot.alpha - detail.previousAlpha;
      const gammaChange = snapshot.gamma - detail.previousGamma;
      setStatus(
        `Parámetros aplicados: alpha ${snapshot.alpha.toFixed(1)} (${alphaChange >= 0 ? "+" : ""}${alphaChange.toFixed(1)}), ` +
        `gamma ${snapshot.gamma.toFixed(1)} (${gammaChange >= 0 ? "+" : ""}${gammaChange.toFixed(1)}). ` +
        `Se reentrenaron ${snapshot.experienceCount} experiencias. ` +
        `${describeChangedCells(detail.changedCells)}`
      );
    }

    if (detail.type === "reset") {
      setStatus(
        `Historial y parámetros restablecidos: alpha ${detail.restoredParameters.alpha.toFixed(1)}, ` +
        `gamma ${detail.restoredParameters.gamma.toFixed(1)}. ` +
        `Se descartaron ${Math.max(0, detail.previousExperienceCount - snapshot.experienceCount)} experiencias añadidas. ` +
        `${describeChangedCells(detail.changedCells)}`
      );
    }
  }

  const initial = qStore.getSnapshot();
  syncControls(initial);
  renderTable(root, initial, [], trainCell);
  renderPolicy(root, initial);
  renderHistory(root, initial);
  setStatus(
    `Tabla lista con ${initial.experienceCount} experiencias: ${formatSourceSummary(initial)}.`
  );

  alpha.addEventListener("input", onParameterInput);
  gamma.addEventListener("input", onParameterInput);
  alpha.addEventListener("change", applyParameters);
  gamma.addEventListener("change", applyParameters);

  resetButton.addEventListener("click", () => {
    if (!resetArmed) {
      resetArmed = true;
      resetButton.textContent = "Confirmar restablecimiento";
      setStatus(
        "Confirma el restablecimiento para volver a las seis experiencias iniciales, restaurar alpha y gamma, y descartar el historial añadido desde la tabla o el simulador."
      );
      return;
    }

    disarmReset();
    pendingFocus = null;
    uiStore.setSimulatorState(null);
    uiStore.setReturnToSimulator(false);
    returnButton.hidden = true;
    qStore.reset();
  });

  if (uiStore.shouldReturnToSimulator()) {
    returnButton.hidden = false;
    returnButton.addEventListener("click", () => {
      disarmReset();
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

    updateStatusFromDetail(snapshot, detail);
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
