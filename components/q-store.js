import {
  actionOrder,
  createExampleExperiences,
  stateOrder
} from "./rl-model.js";

const allowedExperienceSources = new Set(["example", "table", "simulator"]);
const defaultAlpha = 0.5;
const defaultGamma = 0.8;

export function createQStore({
  initialExperiences = createExampleExperiences(),
  initialAlpha = defaultAlpha,
  initialGamma = defaultGamma
} = {}) {
  const listeners = new Set();
  let alpha;
  let gamma;
  let values = createEmptyTable();
  let visits = createEmptyTable();
  let resetExperiences;
  let experiences;

  function createEmptyTable() {
    return Object.fromEntries(
      stateOrder.map((state) => [state, Object.fromEntries(actionOrder.map((action) => [action, 0]))])
    );
  }

  function validateParameters(nextAlpha, nextGamma) {
    const parsedAlpha = Number(nextAlpha);
    const parsedGamma = Number(nextGamma);
    if (!Number.isFinite(parsedAlpha) || parsedAlpha <= 0 || parsedAlpha > 1) {
      throw new RangeError("Alpha debe estar en el intervalo (0, 1].");
    }
    if (!Number.isFinite(parsedGamma) || parsedGamma < 0 || parsedGamma > 0.9) {
      throw new RangeError("Gamma debe estar en el intervalo [0, 0.9].");
    }
    return { alpha: parsedAlpha, gamma: parsedGamma };
  }

  function normalizeExperience(experience) {
    if (!experience || typeof experience !== "object") {
      throw new TypeError("La experiencia debe ser un objeto.");
    }
    if (!stateOrder.includes(experience.state)) throw new RangeError(`Estado desconocido: ${experience.state}.`);
    if (!actionOrder.includes(experience.action)) throw new RangeError(`Acción desconocida: ${experience.action}.`);
    if (!Number.isFinite(experience.reward)) throw new TypeError("La recompensa debe ser un número finito.");
    if (!allowedExperienceSources.has(experience.source)) {
      throw new RangeError("La fuente de la experiencia debe ser example, table o simulator.");
    }
    if (
      (experience.terminated !== undefined && typeof experience.terminated !== "boolean") ||
      (experience.truncated !== undefined && typeof experience.truncated !== "boolean")
    ) {
      throw new TypeError("terminated y truncated deben ser booleanos cuando se informan.");
    }

    const terminated = experience.terminated ?? false;
    const truncated = experience.truncated ?? false;
    if (terminated && truncated) {
      throw new RangeError("Una experiencia no puede ser terminal y truncada al mismo tiempo.");
    }
    if (!terminated && !stateOrder.includes(experience.nextState)) {
      throw new RangeError(`Siguiente estado desconocido: ${experience.nextState}.`);
    }
    if (terminated && experience.nextState !== undefined && !stateOrder.includes(experience.nextState)) {
      throw new RangeError(`Siguiente estado desconocido: ${experience.nextState}.`);
    }

    return {
      ...structuredClone(experience),
      terminated,
      truncated
    };
  }

  function greedyPolicy() {
    return Object.fromEntries(
      stateOrder.map((state) => {
        const bestValue = Math.max(...actionOrder.map((action) => values[state][action]));
        const bestActions = actionOrder.filter(
          (action) => Math.abs(values[state][action] - bestValue) < 0.000001
        );
        return [state, { value: bestValue, actions: bestActions }];
      })
    );
  }

  function snapshot() {
    const sourceCounts = { example: 0, table: 0, simulator: 0 };
    experiences.forEach(({ source }) => {
      sourceCounts[source] += 1;
    });

    return {
      states: [...stateOrder],
      actions: [...actionOrder],
      alpha,
      gamma,
      values: structuredClone(values),
      visits: structuredClone(visits),
      policy: greedyPolicy(),
      experienceCount: experiences.length,
      sourceCounts,
      history: experiences.map(({ state, action, reward, nextState, terminated, truncated, source }) => ({
        state,
        action,
        reward,
        nextState,
        terminated,
        truncated,
        source
      }))
    };
  }

  function applyExperience(rawExperience) {
    const experience = normalizeExperience(rawExperience);
    const { state, action, reward, nextState, terminated, truncated } = experience;
    const current = values[state][action];
    const bestFuture = terminated ? 0 : Math.max(...Object.values(values[nextState]));
    const target = reward + gamma * bestFuture;
    const tdError = target - current;
    const updated = current + alpha * tdError;

    values[state][action] = updated;
    visits[state][action] += 1;

    return {
      ...experience,
      current,
      bestFuture,
      target,
      tdError,
      updated,
      bootstrapped: !terminated,
      truncated
    };
  }

  function recalculateValues() {
    const previousValues = values;
    values = createEmptyTable();
    visits = createEmptyTable();
    experiences.forEach(applyExperience);

    return stateOrder.flatMap((state) =>
      actionOrder
        .filter((action) => Math.abs(previousValues[state][action] - values[state][action]) > 0.000001)
        .map((action) => ({
          state,
          action,
          current: previousValues[state][action],
          updated: values[state][action]
        }))
    );
  }

  function notify(detail) {
    if (listeners.size === 0) return;
    const current = snapshot();
    listeners.forEach((listener) => listener(current, detail));
  }

  const initialParameters = validateParameters(initialAlpha, initialGamma);
  alpha = initialParameters.alpha;
  gamma = initialParameters.gamma;
  resetExperiences = initialExperiences.map(normalizeExperience);
  experiences = structuredClone(resetExperiences);
  recalculateValues();

  return {
    getSnapshot: snapshot,
    setParameters(nextAlpha, nextGamma) {
      const parsed = validateParameters(nextAlpha, nextGamma);
      if (parsed.alpha === alpha && parsed.gamma === gamma) return false;
      const previousAlpha = alpha;
      const previousGamma = gamma;
      alpha = parsed.alpha;
      gamma = parsed.gamma;
      const changedCells = recalculateValues();
      notify({ type: "parameters", changedCells, previousAlpha, previousGamma });
      return true;
    },
    update(rawExperience) {
      const experience = normalizeExperience(rawExperience);
      experiences.push(experience);
      const result = applyExperience(experience);
      const detail = {
        type: "update",
        ...result,
        changedCells: [{ state: result.state, action: result.action, current: result.current, updated: result.updated }]
      };
      notify(detail);
      return detail;
    },
    reset() {
      const previousAlpha = alpha;
      const previousGamma = gamma;
      const previousExperienceCount = experiences.length;
      alpha = initialParameters.alpha;
      gamma = initialParameters.gamma;
      experiences = structuredClone(resetExperiences);
      const changedCells = recalculateValues();
      notify({
        type: "reset",
        changedCells,
        previousAlpha,
        previousGamma,
        previousExperienceCount,
        restoredParameters: { ...initialParameters }
      });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
