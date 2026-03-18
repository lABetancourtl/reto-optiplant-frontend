import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BranchOperationsService } from '../../../services/sucursal/branch-operations.service';
import { SaleItemDetail } from '../../../models/branch-operations.models';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-venta-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './venta-detalle.component.html',
  styleUrl: './venta-detalle.component.css'
})
export class VentaDetalleComponent implements OnInit {
  private readonly paymentMethodLabels = new Set(['MOSTRADOR', 'EFECTIVO', 'TARJETA', 'TRANSFERENCIA']);
  saleId = 0;
  items: SaleItemDetail[] = [];
  saleCustomerName = 'Mostrador';
  saleCreatedAt = '';
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

  asDate(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }

  private loadSaleItems(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      items: this.branchOperationsService.getSaleItems(this.saleId),
      sales: this.branchOperationsService.getMySales()
    }).subscribe({
      next: ({ items, sales }) => {
        this.items = this.normalizeSaleItems(items);

        const sale = sales.find((s) => s.id === this.saleId);
        this.saleCustomerName = this.normalizeCustomerName(sale?.customerName);
        this.saleCreatedAt = sale?.createdAt || '';
      },
      error: (error) => {
        this.errorMessage = getApiErrorMessage(error, 'No se pudo cargar el detalle de la venta.');
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private normalizeSaleItems(rawItems: SaleItemDetail[]): SaleItemDetail[] {
    return rawItems.map((item) => {
      const anyItem = item as unknown as {
        id?: number;
        saleItemId?: number;
        productId?: number;
        productName?: string;
        quantity?: number;
        qty?: number;
        unitPrice?: number;
        price?: number;
        subtotal?: number;
        product?: {
          id?: number;
          name?: string;
          productId?: number;
          productName?: string;
          price?: number;
        };
      };

      const quantity = Number(anyItem.quantity ?? anyItem.qty ?? 0);
      const unitPrice = Number(anyItem.unitPrice ?? anyItem.price ?? anyItem.product?.price ?? 0);

      const normalized: SaleItemDetail = {
        id: Number(anyItem.id ?? anyItem.saleItemId ?? 0),
        productId: Number(anyItem.productId ?? anyItem.product?.id ?? anyItem.product?.productId ?? 0),
        productName: String(anyItem.productName ?? anyItem.product?.name ?? anyItem.product?.productName ?? '').trim(),
        quantity,
        unitPrice,
        subtotal: Number(anyItem.subtotal ?? quantity * unitPrice)
      };

      return normalized;
    });
  }

  private normalizeCustomerName(value?: string): string {
    const customer = String(value ?? '').trim();
    if (!customer) {
      return 'Mostrador';
    }

    const normalized = customer.toUpperCase();
    if (this.paymentMethodLabels.has(normalized)) {
      return 'Mostrador';
    }

    return customer;
  }
}
