# Dashboard ADMIN Sprint 3 - Gaps backend detectados

## Estado actual
Se implementaron los módulos de Sprint 3 reutilizando endpoints existentes:
- `/admin/analytics/sales/by-branch/time-series` para comparativos por periodo.
- `/transfers` para distribución por estado, línea temporal y recientes.
- `/inventories` para inventario crítico (stock bajo y cero).

## Gaps detectados y fallback aplicado

### 1) Transferencias completadas por fecha real de cierre
**Gap**: el payload actual de transferencias no expone `completedAt` (solo `createdAt`).

**Impacto**: la métrica de línea temporal de `completadas` se calcula con `createdAt` como aproximación.

**Fallback UI**:
- Mensaje visible en widget: "La serie de completadas se calcula con fecha de creación por falta de fecha de finalización".

**Contrato sugerido**:
- `GET /admin/analytics/transfers/time-series`
- Query params: `granularity=DAY|WEEK|MONTH|YEAR`, `fromDate`, `toDate`, `branchId?`
- Response sugerido:
```json
{
  "granularity": "MONTH",
  "fromDate": "2026-01-01",
  "toDate": "2026-03-31",
  "points": [
    {
      "bucketStart": "2026-01-01",
      "requested": 42,
      "completed": 30
    }
  ]
}
```

### 2) Inventario crítico analítico por umbral y agregaciones
**Gap**: no existe endpoint analítico dedicado para inventario crítico por umbral y agregados.

**Impacto**: el frontend calcula en cliente a partir de `/inventories`, útil para MVP pero costoso a escala.

**Fallback UI**:
- Cálculo local de stock bajo (`<= 5`) y stock cero.
- Estados `loading/empty/error` claros por widget.

**Contrato sugerido**:
- `GET /admin/analytics/inventory/critical`
- Query params: `branchId?`, `productId?`, `lowStockThreshold?`, `limit?`
- Response sugerido:
```json
{
  "summary": {
    "lowStockCount": 18,
    "zeroStockCount": 7,
    "affectedBranches": 4
  },
  "lowStock": [
    {
      "branchId": 1,
      "branchName": "Sucursal Norte",
      "productId": 32,
      "productName": "Producto X",
      "categoryName": "Bebidas",
      "quantity": 2
    }
  ],
  "zeroStock": [
    {
      "branchId": 3,
      "branchName": "Sucursal Centro",
      "productId": 10,
      "productName": "Producto Y",
      "categoryName": "Lácteos",
      "quantity": 0
    }
  ]
}
```

### 3) Filtros temporales para endpoints de analítica por producto
**Gap**: endpoints actuales
- `/admin/analytics/products/{productId}/top-branch`
- `/admin/analytics/products/{productId}/sales-by-branch`
no exponen parámetros de rango de fecha/granularidad.

**Impacto**: los widgets de producto siguen operando en alcance global del backend, no en el rango global del dashboard.

**Fallback UI**:
- se mantiene selector global de producto/sucursal y actualización automática.
- los filtros de fecha/granularidad se aplican en módulos que sí soportan temporalidad.

**Contrato sugerido**:
- Extender ambos endpoints con query params opcionales: `fromDate`, `toDate`, `granularity?`, `branchId?`.
