# Transferencias Frontend: cambios y pruebas

## Cambios implementados

- Se extendió el módulo de `traslados` para soportar UX por rol:
  - **ADMIN**: crear transferencia individual/masiva + listado global + detalle con timeline.
  - **SUCURSAL**: ver mis solicitudes, bandeja origen (aprobar/rechazar), bandeja destino, y confirmación por `trackingCode`.
- Se ajustaron filtros de estado al set requerido: `REQUESTED`, `APPROVED`, `REJECTED`, `RECEIVED`.
- Se agregó vista de detalle con datos completos (origen, destino, producto, cantidad, estado, trackingCode, justificación) y timeline simple.
- Se integró actualización en tiempo real:
  - ADMIN: `/topic/transfers/admin`
  - SUCURSAL: `/topic/transfers/branch/{branchId}`
- Se reforzó manejo de errores mostrando mensaje exacto del backend cuando viene en la respuesta.

## Endpoints usados desde Front

- `POST /transfers` crear transferencia (individual o por cada destino en masiva)
- `GET /transfers` listado global ADMIN
- `GET /transfers/user` mis solicitudes
- `GET /transfers/source-branch` bandeja origen
- `GET /transfers/dest-branch` bandeja destino
- `PUT /transfers/{id}/approve-reject` aprobar/rechazar
- `POST /transfers/confirm-receipt` confirmar recepción

## Cómo probar en UI (QA funcional)

### 1) ADMIN con flujo automático

1. Ir a **Admin > Traslados > Crear transferencia**.
2. Elegir origen, un destino con `requiresValidation=false`, producto y cantidad.
3. Crear transferencia.
4. Verificar en resultado por destino el mensaje: **“Transferencia aplicada automáticamente”** y estado `RECEIVED`.

### 2) Flujo normal REQUESTED

1. Crear transferencia a destino que sí requiere validación (o desde usuario SUCURSAL usando flujo normal).
2. Verificar en listado que inicia en `REQUESTED`.

### 3) Aprobación/Rechazo desde sucursal origen

1. Ingresar como SUCURSAL origen.
2. Ir a **Sucursal > Traslados > Bandeja origen**.
3. Sobre estado `REQUESTED`:
   - **Aprobar**: debe pasar a `APPROVED` y devolver `trackingCode`.
   - **Rechazar**: exige justificación y deja estado `REJECTED`.

### 4) Confirmación desde sucursal destino

1. Ingresar como SUCURSAL destino.
2. Ir a **Sucursal > Traslados > Confirmar recepción**.
3. Ingresar `trackingCode` y `receivedQuantity` válida (`>=1`).
4. Buscar preview y confirmar.
5. Verificar estado final `RECEIVED`.

### 5) Transferencia masiva

1. En Admin, seleccionar múltiples sucursales destino.
2. Crear transferencia.
3. Verificar tabla de resultados por destino (éxito/error independiente) y transferencias separadas.

## Nota de build

- El proyecto compila a nivel TypeScript/template para los archivos modificados.
- `npm run build` falla por **budgets globales de bundle/CSS** ya configurados en el proyecto (no por errores de transferencias).