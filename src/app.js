import { createQStore } from "./components/q-store.js";

const slides = [
  "proposito",
  "que-es-rl",
  "comparacion",
  "caso-practico",
  "conceptos",
  "modelado",
  "ciclo",
  "q-learning",
  "simulador",
  "robot-repartidor"
];

const slideLabels = {
  proposito: "Propósito de la aplicación",
  "que-es-rl": "Qué es el aprendizaje por refuerzo",
  comparacion: "Comparación con otros enfoques",
  "caso-practico": "Caso práctico",
  conceptos: "Conceptos fundamentales",
  modelado: "Modelado del entorno",
  ciclo: "Ciclo de interacción",
  "q-learning": "Q-learning y tabla Q",
  simulador: "Simulador de decisiones",
  "robot-repartidor": "Laboratorio: robot repartidor"
};

const links = Array.from(document.querySelectorAll(".section-link"));
const host = document.getElementById("slide-host");
const routeStatus = document.getElementById("route-status");
const menuToggle = document.getElementById("section-menu-toggle");
const loadedStyles = new Map();
const loadedModules = new Map();
const styleAttempts = new Map();
const moduleAttempts = new Map();
const assetVersion = Date.now();
let activeSlide = null;
let loadSequence = 0;
let activeCleanup = null;
let challengeSequence = 0;
const challengeStates = new Map();

const qStore = createQStore();
const uiState = {
  simulator: null,
  returnToSimulator: false
};

const uiStore = {
  getSimulatorState: () => structuredClone(uiState.simulator),
  setSimulatorState: (state) => {
    uiState.simulator = structuredClone(state);
  },
  setReturnToSimulator: (value) => {
    uiState.returnToSimulator = Boolean(value);
  },
  shouldReturnToSimulator: () => uiState.returnToSimulator
};

function createChallenge(root, challenge) {
  const article = root.querySelector("article") ?? root;
  const section = document.createElement("section");
  const slideKey = root.dataset.slide ?? activeSlide ?? "slide";
  const challengeId = `${slideKey}-${++challengeSequence}`;
  const titleId = `challenge-title-${challengeId}`;
  const groupName = `challenge-answer-${challengeId}`;
  section.className = "mini-challenge";
  section.setAttribute("aria-labelledby", titleId);
  section.innerHTML = `
    <p class="eyebrow">Comprueba lo aprendido</p>
    <h3 id="${titleId}">Mini desafío</h3>
    <fieldset class="challenge-fieldset">
      <legend>${challenge.question}</legend>
      <div class="challenge-options"></div>
    </fieldset>
    <button class="button challenge-check" type="button">Comprobar respuesta</button>
    <p class="challenge-feedback" role="status" aria-live="polite"></p>
  `;

  const options = section.querySelector(".challenge-options");
  const feedback = section.querySelector(".challenge-feedback");
  const checkButton = section.querySelector(".challenge-check");

  challenge.options.forEach(({ label, correct, feedback: optionFeedback }, index) => {
    const optionId = `challenge-option-${challengeId}-${index}`;
    const wrapper = document.createElement("label");
    wrapper.className = "challenge-option";
    wrapper.innerHTML = `
      <input id="${optionId}" type="radio" name="${groupName}" value="${index}">
      <span>${label}</span>
    `;
    wrapper.dataset.correct = String(correct);
    wrapper.dataset.feedback = optionFeedback ?? challenge.explanation;
    options.append(wrapper);
  });

  const savedChallenge = challengeStates.get(slideKey);
  if (savedChallenge) {
    const savedInput = options.querySelector(`input[value="${savedChallenge.selectedIndex}"]`);
    if (savedInput) {
      savedInput.checked = true;
      const savedOption = savedInput.closest(".challenge-option");
      savedOption.classList.add("is-selected");
      if (savedChallenge.evaluated) {
        savedOption.classList.add(savedChallenge.correct ? "is-correct" : "is-incorrect");
        feedback.textContent = savedChallenge.feedback;
      }
    }
  }

  options.addEventListener("change", () => {
    options.querySelectorAll(".challenge-option").forEach((option) => {
      option.classList.toggle("is-selected", option.querySelector("input")?.checked);
      option.classList.remove("is-correct", "is-incorrect");
    });
    feedback.textContent = "";
    const selected = options.querySelector(`input[name="${groupName}"]:checked`);
    challengeStates.set(slideKey, {
      selectedIndex: selected?.value,
      evaluated: false,
      correct: false,
      feedback: ""
    });
  });

  checkButton.addEventListener("click", () => {
    const selected = options.querySelector(`input[name="${groupName}"]:checked`);
    options.querySelectorAll(".challenge-option").forEach((option) => {
      option.classList.remove("is-correct", "is-incorrect");
    });

    if (!selected) {
      feedback.textContent = "Selecciona una respuesta antes de comprobar.";
      options.querySelector("input")?.focus();
      return;
    }

    const selectedOption = selected.closest(".challenge-option");
    const correct = selectedOption.dataset.correct === "true";
    selectedOption.classList.add(correct ? "is-correct" : "is-incorrect");
    const feedbackText =
      `${correct ? "Correcto. " : "Revisa esta idea. "}${selectedOption.dataset.feedback}`;
    feedback.textContent = feedbackText;
    challengeStates.set(slideKey, {
      selectedIndex: selected.value,
      evaluated: true,
      correct,
      feedback: feedbackText
    });
  });

  article.append(section);
}

const componentContext = {
  qStore,
  uiStore,
  createChallenge,
  navigate: (slide, options = {}) => {
    if (!slides.includes(slide)) return;
    if (window.location.hash !== `#${slide}`) {
      window.location.hash = slide;
    } else {
      loadSlide(slide, { ...options, updateHash: false });
    }
  }
};

function ensureStylesheet(slide) {
  if (!loadedStyles.has(slide)) {
    const stylesheetPromise = new Promise((resolve, reject) => {
      const attempt = styleAttempts.get(slide) ?? 0;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `src/components/${slide}/${slide}.css?v=${assetVersion}${attempt ? `&retry=${attempt}` : ""}`;
      link.dataset.componentStyle = slide;
      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", () => {
        link.remove();
        loadedStyles.delete(slide);
        styleAttempts.set(slide, attempt + 1);
        reject(new Error(`No se pudo cargar el estilo del componente "${slide}".`));
      }, { once: true });
      document.head.append(link);
    });
    loadedStyles.set(slide, stylesheetPromise);
  }
  return loadedStyles.get(slide);
}

async function getModule(slide) {
  if (!loadedModules.has(slide)) {
    const attempt = moduleAttempts.get(slide) ?? 0;
    const suffix = `?v=${assetVersion}${attempt ? `&retry=${attempt}` : ""}`;
    loadedModules.set(slide, import(`./components/${slide}/${slide}.js${suffix}`));
  }
  try {
    return await loadedModules.get(slide);
  } catch (error) {
    loadedModules.delete(slide);
    moduleAttempts.set(slide, (moduleAttempts.get(slide) ?? 0) + 1);
    throw error;
  }
}

function setCurrentLink(slide) {
  links.forEach((link) => {
    if (link.dataset.slide === slide) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  const currentIndex = slides.indexOf(slide);
  const toggleLabel = menuToggle.querySelector("span:first-child");
  if (toggleLabel && currentIndex >= 0) {
    toggleLabel.textContent = `Sección ${currentIndex + 1} de ${slides.length} · ${slideLabels[slide]}`;
  }
}

function appendSlideNavigation(container, slide) {
  const currentIndex = slides.indexOf(slide);
  const previous = slides[currentIndex - 1];
  const next = slides[currentIndex + 1];
  const navigation = document.createElement("nav");
  navigation.className = "slide-navigation";
  navigation.setAttribute("aria-label", "Navegación entre secciones");
  navigation.innerHTML = `
    <div class="slide-navigation-links">
      ${previous ? `<a class="button button-secondary" href="#${previous}">← Anterior: ${slideLabels[previous]}</a>` : "<span></span>"}
      ${next ? `<a class="button" href="#${next}">Siguiente: ${slideLabels[next]} →</a>` : "<span></span>"}
    </div>
  `;
  container.append(navigation);
}

function addSlideProgress(container, slide) {
  const currentIndex = slides.indexOf(slide);
  const heading = container.querySelector("h2");
  if (!heading) return;
  const progressValue = Math.round(((currentIndex + 1) / slides.length) * 100);
  const progress = document.createElement("p");
  progress.className = "slide-progress";
  progress.style.setProperty("--slide-progress", `${progressValue}%`);
  progress.innerHTML = `
    <span class="slide-progress-text">Sección ${currentIndex + 1} de ${slides.length}</span>
    <span class="slide-progress-track" aria-hidden="true"><span></span></span>
  `;
  heading.insertAdjacentElement("afterend", progress);
}

function focusSlideHeading() {
  const heading = host.querySelector("h2");
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus();
}

function showRouteStatus(message, type = "loading", retrySlide = null) {
  routeStatus.className = `route-status is-${type}`;
  routeStatus.setAttribute("role", type === "error" ? "alert" : "status");
  routeStatus.hidden = false;
  routeStatus.replaceChildren(document.createTextNode(message));
  if (retrySlide) {
    const retry = document.createElement("button");
    retry.className = "button button-secondary";
    retry.type = "button";
    retry.textContent = "Reintentar";
    retry.addEventListener("click", () => loadSlide(retrySlide, { force: true, focus: true }));
    routeStatus.append(retry);
    if (type === "error") retry.focus();
  }
}

function hideRouteStatus() {
  routeStatus.hidden = true;
  routeStatus.textContent = "";
}

async function loadSlide(requestedSlide, options = {}) {
  const requestedIsValid = slides.includes(requestedSlide);
  const slide = requestedIsValid ? requestedSlide : slides[0];
  if (slide === activeSlide && !options.force) {
    if (options.focus) focusSlideHeading();
    return;
  }

  const sequence = ++loadSequence;
  host.setAttribute("aria-busy", "true");
  showRouteStatus(`Cargando ${slideLabels[slide]}…`);

  try {
    const [response, component] = await Promise.all([
      fetch(`src/components/${slide}/${slide}.html?v=${assetVersion}`),
      getModule(slide),
      ensureStylesheet(slide)
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markup = await response.text();
    if (sequence !== loadSequence) return;

    const staging = document.createElement("div");
    staging.dataset.slide = slide;
    staging.innerHTML = markup;
    addSlideProgress(staging, slide);
    appendSlideNavigation(staging, slide);
    if (sequence !== loadSequence) {
      return;
    }

    activeCleanup?.();
    host.replaceChildren(...staging.childNodes);
    const nextCleanup = await component.mount?.(host, componentContext);
    // DIDACTIC_ENHANCEMENTS_EVENT_START
    window.dispatchEvent(
      new CustomEvent("rl:component-mounted", {
        detail: { slide, host, componentContext },
      }),
    );
    // DIDACTIC_ENHANCEMENTS_EVENT_END
    if (sequence !== loadSequence) {
      if (typeof nextCleanup === "function") nextCleanup();
      return;
    }

    activeCleanup = typeof nextCleanup === "function" ? nextCleanup : null;
    activeSlide = slide;
    host.setAttribute("aria-busy", "false");
    hideRouteStatus();
    setCurrentLink(slide);

    if ((!requestedIsValid && requestedSlide) || (options.updateHash !== false && window.location.hash !== `#${slide}`)) {
      history.replaceState(null, "", `#${slide}`);
    }
    if (options.focus) focusSlideHeading();
  } catch (error) {
    if (sequence !== loadSequence) return;
    host.setAttribute("aria-busy", "false");
    showRouteStatus(
      `No se pudo cargar ${slideLabels[slide]}. ${activeSlide ? "El contenido anterior se conservó. " : ""}` +
        "Comprueba el servidor local y vuelve a intentarlo.",
      "error",
      slide
    );
    console.error(`No se pudo cargar el componente "${slide}".`, error);
  }
}

links.forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    if (window.location.hash === link.getAttribute("href")) {
      loadSlide(link.dataset.slide, { updateHash: false, focus: true });
    }
  });
});

menuToggle.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || menuToggle.getAttribute("aria-expanded") !== "true") return;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.focus();
});

window.addEventListener("hashchange", () => {
  loadSlide(window.location.hash.slice(1), { updateHash: false, focus: true });
});
loadSlide(window.location.hash.slice(1), { updateHash: true, focus: false });
