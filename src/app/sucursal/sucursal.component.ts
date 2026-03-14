import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SucursalSidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from '../admin/shared/header/header.component';

@Component({
  selector: 'app-sucursal',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SucursalSidebarComponent, HeaderComponent],
  templateUrl: './sucursal.component.html',
  styleUrls: ['./sucursal.component.css']
})
export class SucursalComponent {
  sidebarCollapsed = false;
  sidebarMobileOpen = false;

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileSidebar() {
    this.sidebarMobileOpen = !this.sidebarMobileOpen;
  }

  closeMobileSidebar() {
    this.sidebarMobileOpen = false;
  }
}