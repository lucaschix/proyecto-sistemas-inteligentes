# Fuentes Manim

`scenes/` contiene las escenas Python que generan los cuatro videos educativos de la aplicación:

| Fuente | Escena | Video publicado |
| --- | --- | --- |
| `scenes/que-es-rl.py` | `QueEsRLCycle` | `assets/videos/que-es-rl.mp4` |
| `scenes/conceptos.py` | `ConceptosTransicion` | `assets/videos/conceptos.mp4` |
| `scenes/ciclo.py` | `CicloAprendizajeRecompensas` | `assets/videos/ciclo.mp4` |
| `scenes/q-learning.py` | `QLearningTableUpdate` | `assets/videos/q-learning.mp4` |

Los archivos de `assets/videos/` son entregables web. Las carpetas `media/` creadas por Manim son salidas temporales y no deben versionarse.

La demostración DQN de tráfico permanece autocontenida en `traffic_rl_manim/` porque incluye entorno, entrenamiento, modelo, trayectorias y su propio entorno virtual local.
