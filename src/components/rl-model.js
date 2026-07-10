export const stateOrder = ["bajo", "medio", "alto"];

export const actionOrder = ["permitir", "observar", "bloquear", "bloquear_alertar"];

export const metricOrder = [
  "highRiskContained",
  "highRiskUncontained",
  "legitimateEventsBlocked",
  "availabilityImpacts",
  "unnecessaryAlerts",
  "mediumToHighEscalations"
];

export const stateDefinitions = {
  bajo: {
    label: "Riesgo bajo",
    title: "Copia de seguridad autorizada",
    description: "Un servidor conocido transfiere datos durante su ventana habitual de respaldo.",
    facts: [["Origen", "Servidor autorizado"], ["Horario", "Ventana programada"], ["Historial", "Patrón habitual"]]
  },
  medio: {
    label: "Riesgo medio",
    title: "Actividad elevada con riesgo residual",
    description: "Un cliente conocido triplica sus consultas. No hay evidencia suficiente para confirmar una amenaza, pero existe riesgo de escalamiento.",
    facts: [["Origen", "Cliente conocido"], ["Cambio", "3× sobre su media"], ["Evidencia", "Ambigua"]]
  },
  alto: {
    label: "Riesgo alto",
    title: "Intentos de acceso repetidos",
    description: "Una IP desconocida realiza intentos fallidos repetidos contra un panel administrativo.",
    facts: [["Origen", "IP externa nueva"], ["Frecuencia", "18 intentos / 2 min"], ["Servicio", "Panel administrativo"]]
  }
};

export const actionDefinitions = {
  permitir: { label: "Permitir" },
  observar: { label: "Observar" },
  bloquear: { label: "Bloquear" },
  bloquear_alertar: { label: "Bloquear y alertar" }
};

export const outcomeModel = {
  bajo: {
    permitir: outcome(8, "bajo", false, [1, 6, 1], {}),
    observar: outcome(3, "bajo", false, [1, 3, -1], {}),
    bloquear: outcome(-8, "medio", false, [1, -8, -1], {
      legitimateEventsBlocked: 1,
      availabilityImpacts: 1
    }),
    bloquear_alertar: outcome(-10, "medio", false, [1, -8, -3], {
      legitimateEventsBlocked: 1,
      availabilityImpacts: 1,
      unnecessaryAlerts: 1
    })
  },
  medio: {
    permitir: outcome(-4, "alto", false, [-7, 4, -1], { mediumToHighEscalations: 1 }),
    observar: outcome(6, "bajo", false, [4, 3, -1], {}),
    bloquear: outcome(1, "bajo", false, [5, -3, -1], { availabilityImpacts: 1 }),
    bloquear_alertar: outcome(3, "bajo", false, [7, -2, -2], { availabilityImpacts: 1 })
  },
  alto: {
    permitir: outcome(-10, "alto", false, [-10, 1, -1], { highRiskUncontained: 1 }),
    observar: outcome(-5, "alto", false, [-6, 2, -1], { highRiskUncontained: 1 }),
    bloquear: outcome(8, "medio", false, [9, -1, 0], { highRiskContained: 1 }),
    bloquear_alertar: outcome(10, "bajo", false, [10, 2, -2], { highRiskContained: 1 })
  }
};

export const exampleExperiencePairs = [
  ["alto", "bloquear"],
  ["medio", "observar"],
  ["bajo", "permitir"],
  ["bajo", "permitir"],
  ["medio", "permitir"],
  ["alto", "bloquear_alertar"]
];

function outcome(reward, nextState, terminated, [security, availability, operations], metrics) {
  return {
    reward,
    nextState,
    terminated,
    rewardParts: { security, availability, operations },
    metrics: {
      ...Object.fromEntries(metricOrder.map((metric) => [metric, 0])),
      ...metrics
    }
  };
}

export function getOutcome(state, action) {
  const selected = outcomeModel[state]?.[action];
  if (!selected) throw new RangeError(`No existe la transición ${state}/${action}.`);
  return structuredClone(selected);
}

export function createExampleExperiences() {
  return exampleExperiencePairs.map(([state, action]) => ({
    state,
    action,
    ...getOutcome(state, action),
    truncated: false,
    source: "example"
  }));
}
