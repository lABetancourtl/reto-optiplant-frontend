import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cambios',
  imports: [CommonModule],
  templateUrl: './cambios.component.html',
  styleUrl: './cambios.component.css'
})
export class CambiosComponent {
  stats = {
    solicitudesHoy: 11,
    enRevision: 4,
    resueltas: 7
  };

  recentRequests = [
    { folio: 'C-401', producto: 'Armazón Classic', motivo: 'Talla incorrecta', estado: 'En revisión' },
    { folio: 'C-402', producto: 'Lente BlueShield', motivo: 'Defecto de fábrica', estado: 'Aprobado' },
    { folio: 'C-403', producto: 'Kit limpieza', motivo: 'Producto equivocado', estado: 'Aprobado' }
  ];
}
