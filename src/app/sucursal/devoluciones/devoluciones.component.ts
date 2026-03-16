import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-devoluciones',
  imports: [CommonModule],
  templateUrl: './devoluciones.component.html',
  styleUrl: './devoluciones.component.css'
})
export class DevolucionesComponent {
  stats = {
    casosActivos: 8,
    porValidar: 3,
    finalizados: 5
  };

  recentReturns = [
    { folio: 'D-210', cliente: 'Laura Martínez', motivo: 'Producto dañado', estado: 'En proceso' },
    { folio: 'D-211', cliente: 'Mostrador', motivo: 'Compra duplicada', estado: 'Cerrado' },
    { folio: 'D-212', cliente: 'Pedro Ruiz', motivo: 'No era el modelo solicitado', estado: 'Cerrado' }
  ];
}
