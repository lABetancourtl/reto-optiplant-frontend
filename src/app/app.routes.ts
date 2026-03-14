import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AdminComponent } from './admin/admin.component';
import { AuthGuard } from './guards/auth.guard';
import { SucursalComponent } from './sucursal/sucursal.component';

// Admin sub-components
import { DashboardComponent as AdminDashboardComponent } from './admin/dashboard/dashboard.component';
import { InventarioComponent } from './admin/inventario/inventario.component';
import { ProductosComponent } from './admin/productos/productos.component';
import { SucursalesComponent as AdminSucursalesComponent } from './admin/sucursales/sucursales.component';
import { SucursalDetalleComponent } from './admin/sucursales/sucursal-detalle/sucursal-detalle.component';
import { ReportesComponent } from './admin/reportes/reportes.component';
import { ConfiguracionComponent } from './admin/configuracion/configuracion.component';
import { CategoriasComponent } from './admin/categorias/categorias.component';

// Sucursal sub-components (los iremos creando)
import { DashboardComponent as SucursalDashboardComponent } from './sucursal/dashboard/dashboard.component';
import { InventarioComponent as SucursalInventarioComponent } from './sucursal/inventario/inventario.component';
import { VentasComponent } from './sucursal/ventas/ventas.component';
import { CambiosComponent } from './sucursal/cambios/cambios.component';
import { DevolucionesComponent } from './sucursal/devoluciones/devoluciones.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'inventario', component: InventarioComponent },
      { path: 'categorias', component: CategoriasComponent },
      { path: 'productos', component: ProductosComponent },
      { path: 'sucursales', component: AdminSucursalesComponent },
      { path: 'sucursales/:id', component: SucursalDetalleComponent },
      { path: 'reportes', component: ReportesComponent },
      { path: 'configuracion', component: ConfiguracionComponent }
    ]
  },
  {
    path: 'sucursal',
    component: SucursalComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: SucursalDashboardComponent },
      { path: 'inventario', component: SucursalInventarioComponent },
      { path: 'ventas', component: VentasComponent },
      { path: 'cambios', component: CambiosComponent },
      { path: 'devoluciones', component: DevolucionesComponent },
    ]
  },
];