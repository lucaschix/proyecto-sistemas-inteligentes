import {
  actionDefinitions,
  getOutcome,
  metricOrder,
  stateDefinitions
} from "../rl-model.js";

const maximumSteps = 5;

export function mount(root, { qStore, uiStore, navigate, createChallenge }) {
  const savedState = uiStore.getSimulatorState();
  let currentState = savedState?.currentState ?? "alto";
  let step = savedState?.step ?? 0;
  let rewardSum = savedState?.rewardSum ?? 0;
  let answered = savedState?.answered ?? false;
  let segmentEnded = savedState?.segmentEnded ?? false;
  let pendingNextState = savedState?.pendingNextState ?? null;
  let metrics = savedState?.metrics ?? emptyMetrics();
  let selectedAction = savedState?.selectedAction ?? null;
  let feedbackState = savedState?.feedbackState ?? null;

  const actionButtons = Array.from(root.querySelectorAll(".action-button"));
  const feedback = root.querySelector("#decision-feedback");
  const nextButton = root.querySelector("#next-scenario");
  const restartButton = root.querySelector("#restart-simulator");
  const restartStatus = root.querySelector("#restart-status");
  let restartArmed = false;

  function emptyMetrics() {
    return Object.fromEntries(metricOrder.map((metric) => [metric, 0]));
  }

  function persistState() {
    uiStore.setSimulatorState({
      currentState,
      step,
      rewardSum,
      answered,
      segmentEnded,
      pendingNextState,
      metrics,
      selectedAction,
      feedbackState
    });
  }

  function updateMetrics(nextMetrics) {
    Object.keys(metrics).forEach((key) => {
      metrics[key] += nextMetrics[key];
      root.querySelector(`[data-metric="${key}"]`).value = metrics[key];
    });
  }

  function renderState() {
    const state = stateDefinitions[currentState];
    const visibleDecision = answered ? step : step + 1;
    root.querySelector("#scenario-progress").textContent =
      `Decisión ${Math.min(visibleDecision, maximumSteps)} de ${maximumSteps}`;
    root.querySelector("#scenario-risk").textContent = state.label;
    root.querySelector("#scenario-risk").dataset.risk = currentState;
    root.querySelector("#scenario-title").textContent = state.title;
    root.querySelector("#scenario-description").textContent = state.description;
    root.querySelector("#scenario-facts").innerHTML = state.facts
      .map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`)
      .join("");
    feedback.hidden = true;
    nextButton.hidden = true;
    actionButtons.forEach((button) => {
      button.disabled = false;
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
  }

  function captureFeedback() {
    return {
      heading: root.querySelector("#feedback-heading").textContent,
      result: root.querySelector("#feedback-result").textContent,
      explanation: root.querySelector("#feedback-explanation").textContent,
      transition: root.querySelector("#feedback-transition").textContent,
      q: root.querySelector("#feedback-q").textContent,
      className: feedback.className,
      nextLabel: nextButton.textContent,
      nextHidden: nextButton.hidden
    };
  }

  function restoreFeedback() {
    if (!feedbackState) return;
    root.querySelector("#feedback-heading").textContent = feedbackState.heading;
    root.querySelector("#feedback-result").textContent = feedbackState.result;
    root.querySelector("#feedback-explanation").textContent = feedbackState.explanation;
    root.querySelector("#feedback-transition").textContent = feedbackState.transition;
    root.querySelector("#feedback-q").textContent = feedbackState.q;
    feedback.className = feedbackState.className;
    feedback.hidden = false;
    nextButton.textContent = feedbackState.nextLabel;
    nextButton.hidden = feedbackState.nextHidden;
    actionButtons.forEach((button) => {
      const isSelected = button.dataset.action === selectedAction;
      button.disabled = true;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function choose(action, selectedButton) {
    if (answered) return;
    answered = true;

    const stateBefore = currentState;
    const outcome = getOutcome(stateBefore, action);
    const isLastStep = step === maximumSteps - 1;
    const truncated = isLastStep && !outcome.terminated;
    const change = qStore.update({
      state: stateBefore,
      action,
      ...outcome,
      truncated,
      source: "simulator"
    });

    rewardSum += outcome.reward;
    step += 1;
    pendingNextState = outcome.nextState;
    segmentEnded = outcome.terminated || truncated;
    selectedAction = action;
    updateMetrics(outcome.metrics);

    root.querySelector("#total-score").value = rewardSum;
    root.querySelector("#feedback-result").textContent =
      "Recompensa proxy: " +
      `${outcome.reward > 0 ? "+" : ""}${outcome.reward}`;
    root.querySelector("#feedback-explanation").textContent =
      `Seguridad ${outcome.rewardParts.security}, disponibilidad ${outcome.rewardParts.availability}, ` +
      `impacto operativo ${outcome.rewardParts.operations}.`;
    root.querySelector("#feedback-transition").textContent =
      `${stateDefinitions[stateBefore].label} → ${stateDefinitions[outcome.nextState].label}` +
      `${truncated ? " (segmento truncado al alcanzar cinco pasos)." : "."}`;
    root.querySelector("#feedback-q").textContent =
      `Objetivo TD ${change.target.toFixed(2)}; valor Q(${stateDefinitions[stateBefore].label}, ` +
      `${actionDefinitions[action].label}) ` +
      `${change.current.toFixed(2)} → ${change.updated.toFixed(2)}.`;

    feedback.className =
      `feedback-card ${outcome.reward >= 5 ? "is-positive" : outcome.reward < 0 ? "is-negative" : "is-neutral"}`;
    feedback.hidden = false;
    actionButtons.forEach((button) => {
      button.disabled = true;
      button.classList.toggle("is-selected", button === selectedButton);
      button.setAttribute("aria-pressed", String(button === selectedButton));
    });
    nextButton.textContent = segmentEnded ? "Ver resumen del segmento" : "Continuar al siguiente estado";
    nextButton.hidden = false;
    feedbackState = captureFeedback();
    persistState();
    feedback.focus();
  }

  function showSegmentResult() {
    root.querySelector("#feedback-heading").textContent = "Resumen del segmento";
    root.querySelector("#feedback-result").textContent =
      `Segmento completado: suma no descontada ${rewardSum}`;
    root.querySelector("#feedback-explanation").textContent =
      `Riesgo alto contenido: ${metrics.highRiskContained}; riesgo alto no contenido: ${metrics.highRiskUncontained}; ` +
      `eventos legítimos bloqueados: ${metrics.legitimateEventsBlocked}; impactos de disponibilidad: ` +
      `${metrics.availabilityImpacts}; alertas innecesarias: ${metrics.unnecessaryAlerts}; escaladas de riesgo ` +
      `medio a alto: ${metrics.mediumToHighEscalations}.`;
    root.querySelector("#feedback-transition").textContent =
      metrics.highRiskUncontained === 0 &&
      metrics.legitimateEventsBlocked === 0 &&
      metrics.availabilityImpacts === 0 &&
      metrics.unnecessaryAlerts === 0 &&
      metrics.mediumToHighEscalations === 0
        ? "No se observaron riesgos altos sin contener, bloqueos legítimos, impactos, alertas innecesarias ni escaladas."
        : "La suma no descontada no reemplaza estas métricas: revisa qué decisiones generaron cada evento.";
    root.querySelector("#feedback-q").textContent =
      "El simulador añadió estas transiciones al historial de entrenamiento de la tabla Q.";
    feedback.className =
      `feedback-card ${
        metrics.highRiskUncontained === 0 &&
        metrics.legitimateEventsBlocked === 0 &&
        metrics.availabilityImpacts === 0 &&
        metrics.unnecessaryAlerts === 0 &&
        metrics.mediumToHighEscalations === 0
          ? "is-positive"
          : "is-neutral"
      }`;
    nextButton.hidden = true;
    feedbackState = captureFeedback();
    persistState();
    feedback.focus();
  }

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => choose(button.dataset.action, button));
  });

  nextButton.addEventListener("click", () => {
    if (segmentEnded) {
      showSegmentResult();
      return;
    }
    currentState = pendingNextState;
    answered = false;
    selectedAction = null;
    feedbackState = null;
    renderState();
    persistState();
    root.querySelector("#scenario-title").focus();
  });

  restartButton.addEventListener("click", () => {
    if ((step > 0 || answered) && !restartArmed) {
      restartArmed = true;
      restartButton.textContent = "Confirmar nuevo segmento";
      restartStatus.textContent = "Vuelve a activar el botón para descartar el progreso de este segmento.";
      return;
    }
    currentState = "alto";
    step = 0;
    rewardSum = 0;
    answered = false;
    segmentEnded = false;
    pendingNextState = null;
    metrics = emptyMetrics();
    selectedAction = null;
    feedbackState = null;
    root.querySelector("#total-score").value = 0;
    root.querySelectorAll("[data-metric]").forEach((output) => {
      output.value = 0;
    });
    root.querySelector("#feedback-heading").textContent = "Resultado de la decisión";
    restartArmed = false;
    restartButton.textContent = "Iniciar nuevo segmento";
    restartStatus.textContent = "Se inició un segmento nuevo; el historial de la tabla Q se conserva.";
    renderState();
    persistState();
    root.querySelector("#scenario-title").focus();
  });

  root.querySelector("#view-q-table").addEventListener("click", () => {
    persistState();
    uiStore.setReturnToSimulator(true);
    navigate("q-learning", { focus: true });
  });

  createChallenge(root, {
    question: "Al terminar cinco pasos, ¿qué cantidad muestra “Suma no descontada”?",
    options: [
      {
        label: "La suma directa de las cinco recompensas proxy",
        correct: true,
        feedback: "Ese resumen no aplica gamma y se mantiene separado de las métricas auxiliares simuladas."
      },
      {
        label: "El mayor valor Q de la tabla",
        correct: false,
        feedback: "Un valor Q estima retorno descontado para una combinación estado–acción."
      },
      {
        label: "La cantidad de riesgos altos contenidos",
        correct: false,
        feedback: "Esa es una métrica auxiliar simulada, no una suma de recompensas."
      }
    ]
  });

  const resumeAnswered = answered;
  renderState();
  root.querySelector("#total-score").value = rewardSum;
  Object.entries(metrics).forEach(([metric, value]) => {
    root.querySelector(`[data-metric="${metric}"]`).value = value;
  });
  answered = resumeAnswered;
  if (resumeAnswered) restoreFeedback();
  persistState();

  return persistState;
}
