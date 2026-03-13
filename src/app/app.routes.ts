import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AdminComponent } from './admin/admin.component';
import { SucursalComponent } from './sucursal/sucursal.component';
import { AuthGuard } from './guards/auth.guard';

// Admin sub-components
import { DashboardComponent as AdminDashboardComponent } from './admin/dashboard/dashboard.component';
import { InventarioComponent } from './admin/inventario/inventario.component';
import { ProductosComponent } from './admin/productos/productos.component';
import { SucursalesComponent as AdminSucursalesComponent } from './admin/sucursales/sucursales.component';
import { ReportesComponent } from './admin/reportes/reportes.component';
import { ConfiguracionComponent } from './admin/configuracion/configuracion.component';

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
      { path: 'productos', component: ProductosComponent },
      { path: 'sucursales', component: AdminSucursalesComponent },
      { path: 'reportes', component: ReportesComponent },
      { path: 'configuracion', component: ConfiguracionComponent }
    ]
  },
  { path: 'sucursal', component: SucursalComponent, canActivate: [AuthGuard] },
  // Agregar más rutas aquí
];
