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

## Chat (prueba manual)

1. Inicia sesión como `ADMIN` o `SUCURSAL`.
2. En cualquier vista autenticada, usa la burbuja de chat (abajo a la izquierda).
3. Crea una conversación:
	- `ADMIN`: selecciona una sucursal y pulsa `Nuevo chat`.
	- `SUCURSAL`: selecciona otra sucursal y pulsa `Nuevo chat`.
4. Selecciona la conversación en la lista izquierda y envía mensajes en el panel derecho.
5. Abre otra sesión con otro usuario para validar actualización en tiempo real por WebSocket.
6. Si la conexión WS cae, el estado cambia a `Reconectando` y el envío usa fallback REST cuando aplique.
7. Si el backend responde `401/403`, la UI muestra mensaje de sesión/permisos.
