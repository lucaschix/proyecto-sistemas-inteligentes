export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

export function discountedReturn(rewards, gamma) {
  const parsedGamma = clamp(gamma, 0, 1);

  return rewards.reduce(
    (total, reward, index) => total + Number(reward) * parsedGamma ** index,
    0,
  );
}

export function qLearningUpdate({
  currentQ,
  reward,
  bestFutureQ,
  alpha,
  gamma,
  terminated = false,
}) {
  const parsedAlpha = clamp(alpha, 0, 1);
  const parsedGamma = clamp(gamma, 0, 1);
  const future = terminated ? 0 : Number(bestFutureQ);
  const target = Number(reward) + parsedGamma * future;
  const tdError = target - Number(currentQ);
  const updated = Number(currentQ) + parsedAlpha * tdError;

  return {
    target,
    tdError,
    updated,
    bootstrapped: !terminated,
  };
}

export function deterministicValueIteration({
  outcomeModel,
  states,
  actions,
  gamma = 0.8,
  iterations = 100,
  tolerance = 1e-8,
}) {
  let values = Object.fromEntries(states.map((state) => [state, 0]));
  const qValues = Object.fromEntries(
    states.map((state) => [
      state,
      Object.fromEntries(actions.map((action) => [action, 0])),
    ]),
  );

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const nextValues = {};
    let maximumChange = 0;

    states.forEach((state) => {
      actions.forEach((action) => {
        const outcome = outcomeModel[state][action];
        const future = outcome.terminated ? 0 : values[outcome.nextState];
        qValues[state][action] = Number(outcome.reward) + gamma * future;
      });

      nextValues[state] = Math.max(...actions.map((action) => qValues[state][action]));
      maximumChange = Math.max(
        maximumChange,
        Math.abs(nextValues[state] - values[state]),
      );
    });

    values = nextValues;

    if (maximumChange < tolerance) break;
  }

  // Recalcular Q con los valores finales.
  states.forEach((state) => {
    actions.forEach((action) => {
      const outcome = outcomeModel[state][action];
      const future = outcome.terminated ? 0 : values[outcome.nextState];
      qValues[state][action] = Number(outcome.reward) + gamma * future;
    });
  });

  const policy = Object.fromEntries(
    states.map((state) => {
      const bestValue = Math.max(...actions.map((action) => qValues[state][action]));
      const bestActions = actions.filter(
        (action) => Math.abs(qValues[state][action] - bestValue) < 1e-7,
      );

      return [
        state,
        {
          value: bestValue,
          actions: bestActions,
        },
      ];
    }),
  );

  return { values, qValues, policy };
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

export function simulatePolicy({
  initialState,
  steps,
  chooseAction,
  getOutcome,
  metricOrder = [],
}) {
  let state = initialState;
  let reward = 0;
  const metrics = Object.fromEntries(metricOrder.map((metric) => [metric, 0]));
  const history = [];

  for (let index = 0; index < steps; index += 1) {
    const action = chooseAction(state, index);
    const outcome = getOutcome(state, action);

    reward += Number(outcome.reward);

    metricOrder.forEach((metric) => {
      metrics[metric] += Number(outcome.metrics?.[metric] ?? 0);
    });

    history.push({
      step: index + 1,
      state,
      action,
      reward: Number(outcome.reward),
      nextState: outcome.nextState,
      terminated: Boolean(outcome.terminated),
    });

    if (outcome.terminated) break;
    state = outcome.nextState;
  }

  return {
    reward,
    metrics,
    history,
    finalState: state,
  };
}

export function scoreAnswers(answerKeys, expectedAnswers) {
  const total = expectedAnswers.length;
  const correct = expectedAnswers.reduce(
    (count, answer, index) => count + Number(answerKeys[index] === answer),
    0,
  );

  return {
    correct,
    total,
    ratio: total === 0 ? 0 : correct / total,
  };
}
