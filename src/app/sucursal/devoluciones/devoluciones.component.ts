import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BranchOperationsService } from '../../services/sucursal/branch-operations.service';
import { ReturnRecord } from '../../models/branch-operations.models';
import { getApiErrorMessage } from '../../shared/utils/api-error.util';

@Component({
  selector: 'app-devoluciones',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './devoluciones.component.html',
  styleUrl: './devoluciones.component.css'
})
export class DevolucionesComponent {
  returnForm;

  records: ReturnRecord[] = [];
  submitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private branchOperationsService: BranchOperationsService
  ) {
    this.returnForm = this.fb.group({
      saleId: [null as number | null, [Validators.required, Validators.min(1)]],
      saleItemId: [null as number | null, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reason: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  get casosActivos(): number {
    return this.records.filter((item) => (item.status ?? '').toUpperCase() === 'PENDING').length;
  }

  get porValidar(): number {
    return this.casosActivos;
  }

  get finalizados(): number {
    return this.records.filter((item) => (item.status ?? '').toUpperCase() !== 'PENDING').length;
  }

  submitReturn(): void {
    if (this.returnForm.invalid) {
      this.returnForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.submitting = true;

    this.branchOperationsService.registerReturn(this.returnForm.getRawValue() as any).subscribe({
      next: (result) => {
        this.records = [result, ...this.records];
        this.successMessage = result.message || 'Devolución registrada correctamente.';
        this.returnForm.reset({ saleId: null, saleItemId: null, quantity: 1, reason: '' });
      },
      error: (error) => {
        this.errorMessage = getApiErrorMessage(error, 'No se pudo registrar la devolución.');
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  getStatusLabel(status?: string): string {
    const normalized = (status ?? '').toUpperCase();
    if (normalized === 'PENDING') return 'Pendiente';
    if (normalized === 'APPROVED') return 'Aprobada';
    if (normalized === 'REJECTED') return 'Rechazada';
    return status || 'Registrada';
  }
}
