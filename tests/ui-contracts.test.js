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

test("la tabla Q conecta una transición concreta con la celda actualizada", async () => {
  const [markup, styles] = await Promise.all([
    read("components/q-learning/q-learning.html"),
    read("style.css")
  ]);

  assert.match(markup, /class="q-transition-bridge" aria-labelledby="q-transition-title"/);
  assert.match(markup, /Datos de la transición que alimentan la actualización Q/);
  assert.match(markup, /<span class="q-flow-label">Estado<\/span>\s*<strong>Riesgo alto<\/strong>/);
  assert.match(markup, /<span class="q-flow-label">Acción<\/span>\s*<strong>Bloquear<\/strong>/);
  assert.match(markup, /<span class="q-flow-label">Recompensa<\/span>\s*<strong>\+8<\/strong>/);
  assert.match(markup, /<span class="q-flow-label">Siguiente estado<\/span>\s*<strong>Riesgo medio<\/strong>/);
  assert.match(markup, /<code>Q\(alto, bloquear\)<\/code>/);
  assert.match(markup, /<figcaption class="q-target-label">Celda actualizada por esta transición<\/figcaption>/);
  assert.match(markup, /fila <strong>Riesgo alto<\/strong> y la columna <strong>Bloquear<\/strong>/);
  assert.match(markup, /enfoca la tabla y usa el teclado/);
  assert.match(styles, /\.q-transition-flow\s*{/);
  assert.match(styles, /grid-template-columns: repeat\(4, minmax\(8rem, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.q-transition-flow\s*{\s*grid-template-columns: 1fr;/);
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

test("la estructura principal ofrece resumen, salto accesible y progreso visual", async () => {
  const [markup, script, styles] = await Promise.all([
    read("index.html"),
    read("proyect.js"),
    read("style.css")
  ]);

  assert.match(markup, /<a class="skip-link" href="#slide-host">Saltar al contenido principal<\/a>/);
  assert.match(markup, /class="page-shell learning-overview" aria-label="Resumen del recorrido"/);
  assert.match(markup, /<strong>10 secciones<\/strong>/);
  assert.match(markup, /<strong>4 videos Manim<\/strong>/);
  assert.match(script, /slide-progress-track/);
  assert.match(script, /--slide-progress/);
  assert.match(styles, /\.learning-overview\s*{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.section-link::before[\s\S]*counter\(section-nav, decimal-leading-zero\)/);
  assert.match(styles, /\.slide-progress-track\s*{/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.learning-overview\s*{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*\.overview-item span\s*{\s*display: none;/);
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

test("la interfaz usa la paleta visual solicitada", async () => {
  const [styles, trafficPage] = await Promise.all([
    read("style.css"),
    read("traffic_rl_manim/index.html")
  ]);

  for (const color of ["#6C5CE7", "#3D8BFF", "#2ECC71", "#FFC107", "#FF6B6B", "#EDE7FF", "#F5F6FA", "#1E293B", "#FFFFFF"]) {
    assert.match(styles, new RegExp(color, "i"));
  }

  assert.match(trafficPage, /--background: #F5F6FA/);
  assert.match(trafficPage, /--action: #6C5CE7/);
});

test("la interfaz adopta el lenguaje visual del dashboard educativo de referencia", async () => {
  const styles = await read("style.css");

  for (const color of ["#050607", "#C8CED1", "#3717F8", "#B1FE29"]) {
    assert.match(styles, new RegExp(color, "i"));
  }

  assert.match(styles, /\.site-header\s*{[\s\S]*background: var\(--dashboard-black\)/);
  assert.match(styles, /\.side-menu\s*{[\s\S]*position: sticky;[\s\S]*background: var\(--dashboard-black\)/);
  assert.match(styles, /\.overview-item:first-child\s*{[\s\S]*background: var\(--dashboard-violet\)/);
  assert.match(styles, /\.overview-item:last-child\s*{[\s\S]*background: var\(--dashboard-lime\)/);
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

test("las secciones introductorias integran videos Manim responsivos", async () => {
  const [rlMarkup, conceptsMarkup, cicloMarkup, qMarkup, styles, rlManim, conceptsManim, cicloManim, qManim] = await Promise.all([
    read("components/que-es-rl/que-es-rl.html"),
    read("components/conceptos/conceptos.html"),
    read("components/ciclo/ciclo.html"),
    read("components/q-learning/q-learning.html"),
    read("style.css"),
    read("components/que-es-rl/que-es-rl-manim.py"),
    read("components/conceptos/conceptos-manim.py"),
    read("components/ciclo/ciclo-manim.py"),
    read("components/q-learning/q-learning-manim.py")
  ]);

  assert.match(rlMarkup, /<figure class="learning-video">/);
  assert.match(rlMarkup, /aria-describedby="que-es-rl-video-caption que-es-rl-video-description"/);
  assert.match(rlMarkup, /src="video\/que-es-rl\.mp4"/);
  assert.match(rlMarkup, /class="visual-key"[\s\S]*1\. Estado[\s\S]*2\. Acción[\s\S]*3\. Recompensa[\s\S]*4\. Siguiente estado/);
  assert.match(rlMarkup, /id="que-es-rl-video-description"[\s\S]*actualiza su política o\s+valor Q/);
  assert.match(conceptsMarkup, /<figure class="learning-video">/);
  assert.match(conceptsMarkup, /aria-describedby="conceptos-video-caption conceptos-video-description"/);
  assert.match(conceptsMarkup, /src="video\/conceptos\.mp4"/);
  assert.match(conceptsMarkup, /class="visual-key"[\s\S]*3\. Recompensa proxy/);
  assert.match(conceptsMarkup, /id="conceptos-video-description"[\s\S]*Q\(alto, bloquear\)/);
  assert.match(cicloMarkup, /src="video\/ciclo\.mp4"/);
  assert.match(cicloMarkup, /aria-describedby="ciclo-video-caption ciclo-video-description"/);
  assert.match(cicloMarkup, /class="visual-key"[\s\S]*1\. Observa[\s\S]*4\. Actualiza/);
  assert.match(cicloMarkup, /id="ciclo-video-description"[\s\S]*Q\(alto, bloquear\)/);
  assert.match(qMarkup, /src="video\/q-learning\.mp4"/);
  assert.match(qMarkup, /aria-describedby="q-learning-video-caption q-learning-video-description"/);
  assert.match(qMarkup, /class="visual-key"[\s\S]*1\. Transición[\s\S]*4\. Nuevo valor/);
  assert.match(qMarkup, /id="q-learning-video-description"[\s\S]*4,00 hasta 8,40/);
  assert.match(styles, /\.learning-video video/);
  assert.match(styles, /\.visual-key/);
  assert.match(styles, /\.video-transcript/);
  assert.match(rlManim, /class QueEsRLCycle\(Scene\)/);
  assert.match(conceptsManim, /class ConceptosTransicion\(Scene\)/);
  assert.match(cicloManim, /class CicloAprendizajeRecompensas\(Scene\)/);
  assert.match(qManim, /class QLearningTableUpdate\(Scene\)/);
});

test("el video DQN de tráfico es accesible desde un slide principal", async () => {
  const markup = await read("components/caso-practico/caso-practico.html");

  assert.match(markup, /<figure class="learning-video">/);
  assert.match(markup, /src="traffic_rl_manim\/media\/videos\/traffic_animation\/480p15\/TrafficLearningScene\.mp4"/);
  assert.match(markup, /aria-describedby="traffic-video-caption traffic-video-description"/);
  assert.match(markup, /id="traffic-video-description"[\s\S]*agente aleatorio[\s\S]*agente DQN entrenado/);
});
