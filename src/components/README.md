# Componentes de las slides

Cada carpeta contiene el HTML, CSS y JavaScript exclusivo de una slide:

```text
src/components/<nombre>/
├── <nombre>.html
├── <nombre>.css
└── <nombre>.js
```

`src/app.js` carga estos recursos bajo demanda y entrega a `mount(root, context)` las utilidades compartidas:

- `createChallenge`: crea el mini desafío accesible.
- `qStore`: conserva los parámetros y valores de la tabla Q entre slides.
- `navigate`: abre otra slide sin recargar la página.

Los estilos comunes, tokens y navegación permanecen en `src/styles/main.css`. Los selectores propios de una slide deben
quedar limitados por su clase raíz, por ejemplo `.slide-simulador`.

La carga usa módulos ES y `fetch`, por lo que el proyecto debe abrirse mediante un servidor local:

```bash
python3 -m http.server 8000
```
