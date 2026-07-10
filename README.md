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

Eso inicia un servidor web local con un puerto libre y te muestra la URL exacta en consola. Si prefieres, también puedes ejecutar:

```bash
python3 scripts/serve.py
```

## Ejecutar el proyecto completo

Para la web educativa básica:

```bash
npm start
```

Para la demostración de tráfico con entrenamiento y renderizado:

```bash
cd traffic_rl_manim
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
./run_demo.sh
```

Si Manim no está disponible en tu sistema, el script muestra un mensaje de error claro; en ese caso puedes usar Docker o instalar las dependencias nativas de Manim.

## Pruebas

```bash
npm test
```

Consulta [src/components/README.md](src/components/README.md) para la convención de componentes y [manim/README.md](manim/README.md) para las fuentes de animación.
