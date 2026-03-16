import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ventas',
  imports: [CommonModule],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css'
})
export class VentasComponent {
  stats = {
    ticketsHoy: 37,
    montoDia: '$4,820',
    pendientesCierre: 3
  };

  recentSales = [
    { folio: 'V-1029', cliente: 'Cliente mostrador', total: '$185', estado: 'Pagado' },
    { folio: 'V-1030', cliente: 'María López', total: '$420', estado: 'Pagado' },
    { folio: 'V-1031', cliente: 'Orden telefónica', total: '$95', estado: 'Pendiente' }
  ];
}
