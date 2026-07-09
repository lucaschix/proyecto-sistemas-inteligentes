import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("la tabla Q expone una región desplazable con nombre accesible", async () => {
  const markup = await read("components/q-learning/q-learning.html");
  assert.match(markup, /class="table-wrap"[\s\S]*role="region"/);
  assert.match(markup, /aria-label="Tabla Q interactiva/);
  assert.match(markup, /tabindex="0"/);
  assert.match(markup, /Si no ves todas las acciones, desplázate horizontalmente dentro de la tabla/);
  assert.match(markup, /id="q-table-scroll-hint"/);
  assert.match(markup, /aria-describedby="q-table-instruction q-table-scroll-hint"/);
  assert.match(markup, /role="status" aria-live="polite" aria-atomic="true"/);
});

test("la tabla comparativa expone desplazamiento accesible por teclado", async () => {
  const markup = await read("components/comparacion/comparacion.html");
  assert.match(markup, /class="table-wrap"[\s\S]*role="region"/);
  assert.match(markup, /aria-label="Comparación desplazable/);
  assert.match(markup, /tabindex="0"/);
});

test("la navegación móvil usa un disclosure con estado y relación programática", async () => {
  const markup = await read("index.html");
  assert.match(markup, /id="section-menu-toggle"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /aria-controls="site-nav"/);
});

test("los componentes interactivos usan los tokens semánticos vigentes", async () => {
  const styles = await Promise.all([
    read("components/ciclo/ciclo.css"),
    read("components/modelado/modelado.css"),
    read("components/proposito/proposito.css"),
    read("components/q-learning/q-learning.css"),
    read("components/simulador/simulador.css")
  ]);
  assert.doesNotMatch(styles.join("\n"), /--color-accent(?:-strong)?/);
});

test("simulador y tabla Q conservan un retorno contextual mediante el store de UI", async () => {
  const [app, simulator, qLearning] = await Promise.all([
    read("proyect.js"),
    read("components/simulador/simulador.js"),
    read("components/q-learning/q-learning.js")
  ]);
  assert.match(app, /getSimulatorState/);
  assert.match(simulator, /persistState/);
  assert.match(simulator, /setReturnToSimulator\(true\)/);
  assert.match(qLearning, /shouldReturnToSimulator/);
});

test("la tabla Q explica y confirma el restablecimiento del historial compartido", async () => {
  const [markup, script] = await Promise.all([
    read("components/q-learning/q-learning.html"),
    read("components/q-learning/q-learning.js")
  ]);
  assert.match(markup, /Restablecer historial y parámetros/);
  assert.match(markup, /descarta[\s\S]*experiencias añadidas desde la tabla o el simulador/);
  assert.match(script, /Confirmar restablecimiento/);
  assert.match(script, /setSimulatorState\(null\)/);
});

test("la tabla Q usa fuentes canónicas y feedback de parámetros", async () => {
  const [script, styles] = await Promise.all([
    read("components/q-learning/q-learning.js"),
    read("components/q-learning/q-learning.css")
  ]);
  assert.match(script, /source: "table"/);
  assert.doesNotMatch(script, /source: "manual"/);
  assert.match(script, /Ajuste pendiente/);
  assert.match(script, /Parámetros aplicados/);
  assert.match(styles, /\.range-control\.is-pending/);
  assert.match(styles, /\.history-source/);
});
