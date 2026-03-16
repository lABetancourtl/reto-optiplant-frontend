import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BranchOperationsService } from '../../../services/sucursal/branch-operations.service';
import { SaleItemDetail } from '../../../models/branch-operations.models';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-venta-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './venta-detalle.component.html',
  styleUrl: './venta-detalle.component.css'
})
export class VentaDetalleComponent implements OnInit {
  saleId = 0;
  items: SaleItemDetail[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private branchOperationsService: BranchOperationsService
  ) {}

  ngOnInit(): void {
    this.saleId = Number(this.route.snapshot.paramMap.get('saleId') || 0);
    if (!this.saleId) {
      this.errorMessage = 'El identificador de venta no es válido.';
      return;
    }

    this.loadSaleItems();
  }

  get total(): number {
    return this.items.reduce((acc, item) => acc + (item.subtotal ?? item.quantity * item.unitPrice), 0);
  }

  asCurrency(value?: number): string {
    return `$${Number(value ?? 0).toFixed(2)}`;
  }

  private loadSaleItems(): void {
    this.loading = true;
    this.errorMessage = '';

    this.branchOperationsService.getSaleItems(this.saleId).subscribe({
      next: (items) => {
        this.items = items;
      },
      error: (error) => {
        this.errorMessage = getApiErrorMessage(error, 'No se pudo cargar el detalle de la venta.');
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
