import assert from "node:assert/strict";
import test from "node:test";

import { createQStore } from "../src/components/q-store.js";
import {
  actionOrder,
  getOutcome,
  metricOrder,
  outcomeModel,
  stateOrder
} from "../src/components/rl-model.js";

function experience(state, action, overrides = {}) {
  return {
    state,
    action,
    ...getOutcome(state, action),
    truncated: false,
    source: "table",
    ...overrides
  };
}

test("aplica el objetivo Q-learning no terminal", () => {
  const store = createQStore({ initialExperiences: [] });
  store.update(experience("bajo", "permitir", { reward: 10, terminated: true }));
  const result = store.update(experience("alto", "bloquear", {
    reward: 10,
    nextState: "bajo",
    terminated: false
  }));

  assert.equal(result.bestFuture, 5);
  assert.equal(result.target, 14);
  assert.equal(result.updated, 7);
});

test("una transición terminal no hace bootstrap", () => {
  const store = createQStore({ initialExperiences: [] });
  store.update(experience("bajo", "permitir", { reward: 10, terminated: true }));
  const result = store.update(experience("alto", "bloquear_alertar", {
    reward: 10,
    nextState: "bajo",
    terminated: true
  }));

  assert.equal(result.bestFuture, 0);
  assert.equal(result.target, 10);
  assert.equal(result.updated, 5);
});

test("truncated conserva bootstrap cuando terminated es falso", () => {
  const store = createQStore({ initialExperiences: [] });
  store.update(experience("bajo", "permitir", { reward: 10, terminated: true }));
  const result = store.update(experience("alto", "bloquear", {
    reward: 10,
    nextState: "bajo",
    terminated: false,
    truncated: true
  }));

  assert.equal(result.target, 14);
  assert.equal(result.updated, 7);
});

test("gamma está limitado para evitar ciclos positivos no acotados", () => {
  const store = createQStore({ initialExperiences: [] });
  assert.throws(() => store.setParameters(0.5, 1), /Gamma/);
  store.setParameters(1, 0.9);

  for (let index = 0; index < 100; index += 1) {
    store.update(experience("bajo", "permitir"));
  }

  const value = store.getSnapshot().values.bajo.permitir;
  assert.ok(Number.isFinite(value));
  assert.ok(value <= 80.000001);
});

test("el contrato central cubre las 12 combinaciones y descompone la recompensa", () => {
  stateOrder.forEach((state) => {
    actionOrder.forEach((action) => {
      const outcome = outcomeModel[state][action];
      assert.ok(outcome, `Falta ${state}/${action}`);
      const total = Object.values(outcome.rewardParts).reduce((sum, part) => sum + part, 0);
      assert.equal(total, outcome.reward);
      assert.ok(stateOrder.includes(outcome.nextState));
      assert.equal(outcome.terminated, false);
      assert.deepEqual(Object.keys(outcome.metrics), metricOrder);
      Object.values(outcome.metrics).forEach((value) => {
        assert.ok(Number.isInteger(value) && value >= 0);
      });
    });
  });
});

test("las métricas externas describen eventos sin alterar recompensas ni transiciones", () => {
  const expectedMetrics = {
    "bajo/permitir": {},
    "bajo/observar": {},
    "bajo/bloquear": { legitimateEventsBlocked: 1, availabilityImpacts: 1 },
    "bajo/bloquear_alertar": {
      legitimateEventsBlocked: 1,
      availabilityImpacts: 1,
      unnecessaryAlerts: 1
    },
    "medio/permitir": { mediumToHighEscalations: 1 },
    "medio/observar": {},
    "medio/bloquear": { availabilityImpacts: 1 },
    "medio/bloquear_alertar": { availabilityImpacts: 1 },
    "alto/permitir": { highRiskUncontained: 1 },
    "alto/observar": { highRiskUncontained: 1 },
    "alto/bloquear": { highRiskContained: 1 },
    "alto/bloquear_alertar": { highRiskContained: 1 }
  };

  stateOrder.forEach((state) => {
    actionOrder.forEach((action) => {
      const expected = Object.fromEntries(metricOrder.map((metric) => [metric, 0]));
      Object.assign(expected, expectedMetrics[`${state}/${action}`]);
      assert.deepEqual(getOutcome(state, action).metrics, expected);
    });
  });
});

test("getOutcome es determinista y devuelve copias que no mutan el contrato", () => {
  const first = getOutcome("alto", "bloquear");
  const second = getOutcome("alto", "bloquear");
  assert.deepEqual(first, second);

  first.metrics.highRiskContained = 99;
  first.rewardParts.security = 99;
  assert.equal(getOutcome("alto", "bloquear").metrics.highRiskContained, 1);
  assert.equal(getOutcome("alto", "bloquear").rewardParts.security, 9);
});

test("todo segmento de cinco pasos inicia en alto y finaliza truncado, no terminal", () => {
  const fiveStepTrajectories = Array.from({ length: 5 }).reduce(
    (paths) => paths.flatMap((path) => actionOrder.map((action) => [...path, action])),
    [[]]
  );

  assert.equal(fiveStepTrajectories.length, 1024);
  fiveStepTrajectories.forEach((actions) => {
    let state = "alto";
    actions.forEach((action, index) => {
      const outcome = getOutcome(state, action);
      assert.equal(outcome.terminated, false);
      assert.ok(stateOrder.includes(outcome.nextState));
      const truncated = index === actions.length - 1;
      assert.equal(truncated, index === 4);
      state = outcome.nextState;
    });
  });
});

test("visitas, política y reset son reproducibles", () => {
  const store = createQStore();
  const initial = store.getSnapshot();
  assert.equal(initial.experienceCount, 6);
  assert.equal(initial.visits.bajo.permitir, 2);
  assert.deepEqual(initial.sourceCounts, { example: 6, table: 0, simulator: 0 });

  store.update(experience("alto", "permitir"));
  store.setParameters(0.8, 0.3);
  assert.equal(store.getSnapshot().experienceCount, 7);
  assert.equal(store.getSnapshot().alpha, 0.8);
  assert.equal(store.getSnapshot().gamma, 0.3);

  store.reset();
  assert.deepEqual(store.getSnapshot(), initial);
});

test("reentrenar con nuevos parámetros reproduce valores exactos", () => {
  const store = createQStore();
  store.setParameters(0.8, 0.3);
  const snapshot = store.getSnapshot();

  assert.ok(Math.abs(snapshot.values.bajo.permitir - 9.216) < 1e-9);
  assert.ok(Math.abs(snapshot.values.medio.observar - 4.8) < 1e-9);
  assert.ok(Math.abs(snapshot.values.medio.permitir - -1.664) < 1e-9);
  assert.ok(Math.abs(snapshot.values.alto.bloquear - 6.4) < 1e-9);
  assert.ok(Math.abs(snapshot.values.alto.bloquear_alertar - 10.21184) < 1e-9);
  assert.equal(snapshot.visits.bajo.permitir, 2);
});

test("repetir los mismos parámetros no recalcula ni notifica", () => {
  const store = createQStore();
  let notifications = 0;
  store.subscribe(() => {
    notifications += 1;
  });

  assert.equal(store.setParameters(0.5, 0.8), false);
  assert.equal(notifications, 0);
  assert.equal(store.setParameters(0.6, 0.8), true);
  assert.equal(notifications, 1);
});

test("la política greedy conserva empates e identifica acciones no visitadas", () => {
  const store = createQStore({ initialExperiences: [] });
  assert.deepEqual(store.getSnapshot().policy.bajo.actions, actionOrder);

  store.update(experience("bajo", "bloquear"));
  assert.deepEqual(
    store.getSnapshot().policy.bajo.actions,
    ["permitir", "observar", "bloquear_alertar"]
  );
});

test("la política óptima no prolonga el riesgo alto para cosechar recompensas", () => {
  [0, 0.5, 0.8, 0.9].forEach((gamma) => {
    let values = Object.fromEntries(stateOrder.map((state) => [state, 0]));

    for (let iteration = 0; iteration < 1000; iteration += 1) {
      values = Object.fromEntries(
        stateOrder.map((state) => [
          state,
          Math.max(
            ...actionOrder.map((action) => {
              const outcome = outcomeModel[state][action];
              return outcome.reward + gamma * values[outcome.nextState];
            })
          )
        ])
      );
    }

    const greedyAction = (state) =>
      actionOrder.reduce((best, action) => {
        const candidate = outcomeModel[state][action];
        const selected = outcomeModel[state][best];
        const candidateValue = candidate.reward + gamma * values[candidate.nextState];
        const selectedValue = selected.reward + gamma * values[selected.nextState];
        return candidateValue > selectedValue ? action : best;
      }, actionOrder[0]);

    assert.equal(greedyAction("bajo"), "permitir");
    assert.equal(greedyAction("medio"), "observar");
    assert.equal(greedyAction("alto"), "bloquear_alertar");
  });
});

test("rechaza estados, acciones, recompensas y parámetros inválidos", () => {
  const store = createQStore({ initialExperiences: [] });
  assert.throws(() => store.setParameters(0, 0.8), /Alpha/);
  assert.throws(() => store.setParameters(1.1, 0.8), /Alpha/);
  assert.throws(() => store.setParameters(0.5, -0.1), /Gamma/);
  assert.throws(() => store.setParameters(0.5, 1), /Gamma/);
  assert.throws(() => store.update({ state: "otro", action: "permitir", reward: 1 }), /Estado/);
  assert.throws(
    () => store.update({ state: "bajo", action: "otra", reward: 1, nextState: "bajo" }),
    /Acción/
  );
  assert.throws(
    () => store.update({ state: "bajo", action: "permitir", reward: Number.NaN, nextState: "bajo" }),
    /finito/
  );
  assert.throws(
    () =>
      store.update({
        state: "bajo",
        action: "permitir",
        reward: 1,
        nextState: "otro",
        terminated: false,
        source: "table"
      }),
    /Siguiente estado/
  );
  assert.throws(
    () => store.update(experience("bajo", "permitir", { terminated: true, truncated: true })),
    /terminal y truncada/
  );
  assert.throws(
    () => store.update(experience("bajo", "permitir", { terminated: "false" })),
    /booleanos/
  );
  assert.throws(
    () => store.update(experience("bajo", "permitir", { source: "manual" })),
    /fuente/
  );
  assert.throws(
    () => store.update({ state: "bajo", action: "permitir", reward: 1, nextState: "bajo" }),
    /fuente/
  );
});

test("el historial conserva fuentes separadas de ejemplo, tabla y simulador", () => {
  const store = createQStore();
  store.update(experience("alto", "bloquear", { source: "table" }));
  store.update(experience("medio", "observar", { source: "simulator" }));

  const snapshot = store.getSnapshot();
  assert.deepEqual(snapshot.sourceCounts, { example: 6, table: 1, simulator: 1 });
  assert.deepEqual(snapshot.history.slice(-2).map(({ source }) => source), ["table", "simulator"]);
});
