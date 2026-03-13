import { Component, EventEmitter, Output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();
  
  searchQuery = '';
  notificationsOpen = false;
  userMenuOpen = false;

  notifications = [
    { type: 'warning', message: 'Stock bajo en Fertilizante NPK', time: 'Hace 5 min' },
    { type: 'success', message: 'Pedido #1234 completado', time: 'Hace 15 min' },
    { type: 'info', message: 'Nueva actualización disponible', time: 'Hace 1 hora' },
  ];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    this.notificationsOpen = false;
    this.userMenuOpen = false;
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;
    this.userMenuOpen = false;
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
    this.notificationsOpen = false;
  }
}