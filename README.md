# reto-optiplant-frontend

Frontend de Optiplant desarrollado con Angular 19.

## Requisitos
- Node.js 20+
- npm

## Ejecucion local (sin Docker)

```bash
npm install
npm start
```

App disponible en `http://localhost:4200`.

Por defecto el frontend consume el backend en `http://localhost:8080`.

## Build local

```bash
npm run build
```

## Tests

```bash
npm test
```

## Ejecucion con Docker

Desde este repositorio:

```bash
docker build -t optiplant-frontend .
docker run --rm -p 4200:80 optiplant-frontend
```

La app queda disponible en `http://localhost:4200`.

Nota: para ejecutar frontend + backend + DB juntos, usar el compose de `optiplant-deploy`.
