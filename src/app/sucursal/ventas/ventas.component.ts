import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchOperationsService } from '../../services/sucursal/branch-operations.service';
import { SaleSummary } from '../../models/branch-operations.models';
import { getApiErrorMessage } from '../../shared/utils/api-error.util';

@Component({
  selector: 'app-ventas',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css'
})
export class VentasComponent implements OnInit {
  saleForm: FormGroup;
  sales: SaleSummary[] = [];
  loadingSales = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private branchOperationsService: BranchOperationsService
  ) {
    this.saleForm = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      paymentMethod: ['MOSTRADOR'],
      items: this.fb.array([this.createItemGroup()])
    });
  }

  ngOnInit(): void {
    this.loadSales();
  }

  get items(): FormArray {
    return this.saleForm.get('items') as FormArray;
  }

  get ticketsHoy(): number {
    const today = new Date().toDateString();
    return this.sales.filter((sale) => sale.createdAt && new Date(sale.createdAt).toDateString() === today).length;
  }

  get montoDia(): string {
    const today = new Date().toDateString();
    const total = this.sales
      .filter((sale) => sale.createdAt && new Date(sale.createdAt).toDateString() === today)
      .reduce((acc, sale) => acc + Number(sale.totalAmount ?? 0), 0);
    return `$${total.toFixed(2)}`;
  }

  get pendientesCierre(): number {
    return this.sales.filter((sale) => (sale.status ?? '').toUpperCase() === 'PENDING').length;
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length === 1) {
      return;
    }
    this.items.removeAt(index);
  }

  submitSale(): void {
    if (this.saleForm.invalid) {
      this.saleForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.submitting = true;

    this.branchOperationsService.registerSale(this.saleForm.getRawValue()).subscribe({
      next: () => {
        this.successMessage = 'Venta registrada correctamente.';
        this.saleForm.reset({ customerName: '', paymentMethod: 'MOSTRADOR' });
        this.items.clear();
        this.items.push(this.createItemGroup());
        this.loadSales();
      },
      error: (error) => {
        this.errorMessage = getApiErrorMessage(error, 'No se pudo registrar la venta.');
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  loadSales(): void {
    this.loadingSales = true;
    this.branchOperationsService.getMySales().subscribe({
      next: (sales) => {
        this.sales = sales;
      },
      error: (error) => {
        this.errorMessage = getApiErrorMessage(error, 'No se pudieron cargar las ventas de la sucursal.');
      },
      complete: () => {
        this.loadingSales = false;
      }
    });
  }

  asCurrency(value?: number): string {
    return `$${Number(value ?? 0).toFixed(2)}`;
  }

  asDate(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }

  private createItemGroup(): FormGroup {
    return this.fb.group({
      productId: [null, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0.01)]]
    });
  }
}
