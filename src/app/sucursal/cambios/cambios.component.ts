import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BranchOperationsService } from '../../services/sucursal/branch-operations.service';
import { ExchangeRecord } from '../../models/branch-operations.models';
import { getApiErrorMessage } from '../../shared/utils/api-error.util';

@Component({
  selector: 'app-cambios',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cambios.component.html',
  styleUrl: './cambios.component.css'
})
export class CambiosComponent {
  exchangeForm;

  records: ExchangeRecord[] = [];
  submitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private branchOperationsService: BranchOperationsService
  ) {
    this.exchangeForm = this.fb.group({
      saleId: [null as number | null, [Validators.required, Validators.min(1)]],
      soldProductId: [null as number | null, [Validators.required, Validators.min(1)]],
      newProductId: [null as number | null, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      exactDifferencePaid: [0, [Validators.required, Validators.min(0)]],
      reason: ['']
    });
  }

  get solicitudesHoy(): number {
    return this.records.length;
  }

  get enRevision(): number {
    return this.records.filter((item) => (item.status ?? '').toUpperCase() === 'PENDING').length;
  }

  get resueltas(): number {
    return this.records.filter((item) => (item.status ?? '').toUpperCase() !== 'PENDING').length;
  }

  submitExchange(): void {
    if (this.exchangeForm.invalid) {
      this.exchangeForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.submitting = true;

    this.branchOperationsService.registerExchange(this.exchangeForm.getRawValue() as any).subscribe({
      next: (result) => {
        this.records = [result, ...this.records];
        this.successMessage = result.message || 'Cambio registrado correctamente.';
        this.exchangeForm.reset({
          saleId: null,
          soldProductId: null,
          newProductId: null,
          quantity: 1,
          exactDifferencePaid: 0,
          reason: ''
        });
      },
      error: (error) => {
        this.errorMessage = getApiErrorMessage(error, 'No se pudo registrar el cambio.');
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  getStatusLabel(status?: string): string {
    const normalized = (status ?? '').toUpperCase();
    if (normalized === 'PENDING') return 'Pendiente';
    if (normalized === 'APPROVED') return 'Aprobado';
    if (normalized === 'REJECTED') return 'Rechazado';
    return status || 'Registrado';
  }
}
