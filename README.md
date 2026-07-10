# Proyecto de Sistemas Inteligentes

Aplicación web educativa para aprender los fundamentos del aprendizaje por refuerzo mediante explicaciones visuales, una tabla Q compartida y simuladores interactivos.

## Estructura

```text
.
├── index.html                 # Entrada de la aplicación
├── src/                       # Código fuente web
│   ├── app.js                 # Navegación y carga de componentes
│   ├── components/            # HTML, CSS y JS de cada sección
│   ├── didactic/              # Actividades didácticas compartidas
│   └── styles/main.css        # Estilos y tokens globales
├── assets/
│   ├── learning-visuals/      # Diagramas, iconos y atribuciones
│   └── videos/                # Videos finales consumidos por la web
├── manim/scenes/              # Fuentes Python de videos educativos
├── traffic_rl_manim/          # Experimento DQN de control de tráfico
├── tests/                     # Pruebas automatizadas
├── scripts/                   # Utilidades de integración
├── docs/ y templates/         # Guías y plantillas de trabajo
└── archive/                   # Respaldos y material histórico
```

Las salidas temporales de Manim, los entornos virtuales y los cachés de Python no forman parte del código fuente y están excluidos mediante `.gitignore`.

## Ejecutar localmente

Desde la raíz del repositorio:

```bash
npm start
```

También puedes usar `python3 -m http.server 8000`. Luego abre `http://localhost:8000`.

## Pruebas

```bash
npm test
```

Consulta [src/components/README.md](src/components/README.md) para la convención de componentes y [manim/README.md](manim/README.md) para las fuentes de animación.
