import test from "node:test";
import assert from "node:assert/strict";

import {
  createSeededRandom,
  deterministicValueIteration,
  discountedReturn,
  qLearningUpdate,
  scoreAnswers,
  simulatePolicy,
} from "../src/didactic/didactic-core.js";

test("calcula el retorno descontado del ejemplo", () => {
  assert.equal(discountedReturn([8, 6, 8], 0), 8);
  assert.equal(discountedReturn([8, 6, 8], 0.5), 13);
  assert.ok(Math.abs(discountedReturn([8, 6, 8], 0.8) - 17.92) < 1e-9);
});

test("calcula la actualización Q 4 -> 8,4", () => {
  const result = qLearningUpdate({
    currentQ: 4,
    reward: 8,
    bestFutureQ: 6,
    alpha: 0.5,
    gamma: 0.8,
  });

  assert.equal(result.target, 12.8);
  assert.equal(result.tdError, 8.8);
  assert.equal(result.updated, 8.4);
  assert.equal(result.bootstrapped, true);
});

test("elimina el bootstrap en una terminación natural", () => {
  const result = qLearningUpdate({
    currentQ: 4,
    reward: 8,
    bestFutureQ: 100,
    alpha: 0.5,
    gamma: 0.8,
    terminated: true,
  });

  assert.equal(result.target, 8);
  assert.equal(result.updated, 6);
  assert.equal(result.bootstrapped, false);
});

test("value iteration encuentra la acción de mayor retorno", () => {
  const model = {
    a: {
      stay: { reward: 1, nextState: "a", terminated: false },
      finish: { reward: 4, nextState: "b", terminated: true },
    },
    b: {
      stay: { reward: 0, nextState: "b", terminated: true },
      finish: { reward: 0, nextState: "b", terminated: true },
    },
  };

  const result = deterministicValueIteration({
    outcomeModel: model,
    states: ["a", "b"],
    actions: ["stay", "finish"],
    gamma: 0.8,
  });

  assert.deepEqual(result.policy.a.actions, ["stay"]);
  assert.ok(result.policy.a.value > 4);
});

test("el generador con semilla es reproducible", () => {
  const first = createSeededRandom(7);
  const second = createSeededRandom(7);

  assert.deepEqual(
    [first(), first(), first()],
    [second(), second(), second()],
  );
});

test("simula una política y acumula métricas", () => {
  const getOutcome = (state, action) => ({
    reward: action === "good" ? 2 : -1,
    nextState: state,
    terminated: false,
    metrics: { errors: action === "good" ? 0 : 1 },
  });

  const result = simulatePolicy({
    initialState: "s",
    steps: 3,
    chooseAction: (_, index) => (index === 1 ? "bad" : "good"),
    getOutcome,
    metricOrder: ["errors"],
  });

  assert.equal(result.reward, 3);
  assert.equal(result.metrics.errors, 1);
  assert.equal(result.history.length, 3);
});

test("puntúa respuestas de clasificación", () => {
  assert.deepEqual(
    scoreAnswers(["a", "b", "x"], ["a", "b", "c"]),
    { correct: 2, total: 3, ratio: 2 / 3 },
  );
});
