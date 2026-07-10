import test from "node:test";
import assert from "node:assert/strict";

import {
  createInitialDeliveryState,
  createSeededRandom,
  evaluateDeliveryPolicy,
  runDeliveryTrainingEpisode,
  transitionDelivery,
} from "../components/robot-repartidor/robot-repartidor.js";

test("una colisión mantiene al robot en la posición inicial", () => {
  const initial = createInitialDeliveryState();
  const outcome = transitionDelivery(initial, "left");

  assert.deepEqual(outcome.nextState, initial);
  assert.equal(outcome.reward, -5);
  assert.equal(outcome.collision, true);
});

test("la ruta válida recoge y entrega el paquete", () => {
  const actions = [
    "up",
    "right",
    "right",
    "up",
    "up",
    "left",
    "up",
    "down",
    "right",
    "right",
    "up",
    "up",
    "right",
    "right",
  ];

  let state = createInitialDeliveryState();
  let delivered = false;

  for (const action of actions) {
    const outcome = transitionDelivery(state, action);
    state = outcome.nextState;
    delivered = outcome.terminated;

    if (delivered) break;
  }

  assert.equal(state.carrying, true);
  assert.equal(delivered, true);
});

test("Q-learning aprende una política que completa el reparto", () => {
  const qTable = new Map();
  const random = createSeededRandom(20260710);
  let successes = 0;

  for (let episode = 0; episode < 100; episode += 1) {
    const result = runDeliveryTrainingEpisode(qTable, {
      alpha: 0.5,
      gamma: 0.9,
      epsilon: 0.2,
      random,
    });

    successes += Number(result.delivered);
  }

  const evaluation = evaluateDeliveryPolicy(qTable);

  assert.ok(successes >= 70);
  assert.equal(evaluation.delivered, true);
  assert.ok(evaluation.steps <= 16);
  assert.equal(evaluation.collisions, 0);
});
