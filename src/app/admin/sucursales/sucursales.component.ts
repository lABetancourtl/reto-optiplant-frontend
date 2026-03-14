import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Branch, SucursalesService } from '../../services/sucursal.service';
import { Router } from '@angular/router';


type ModalMode = 'create' | 'edit' | null;
 
@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sucursales.component.html',
  styleUrl: './sucursales.component.css'
})
export class SucursalesComponent implements OnInit {
 
  branches: Branch[] = [];
  filteredBranches: Branch[] = [];
  paginatedBranches: Branch[] = [];
 
  searchTerm = '';
  loading = false;
  error: string | null = null;
 
  // Paginación
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 1;
 
  // Modal crear/editar
  modalMode: ModalMode = null;
  selectedBranch: Branch | null = null;
  form = { name: '', address: '', phone: '' };
  formError: string | null = null;
  saving = false;
 
  // Modal eliminar
  deleteConfirmId: number | null = null;
 
  constructor(private svc: SucursalesService, private router: Router) {}
 
  verDetalle(id: number): void {
    this.router.navigate(['/admin/sucursales', id]);
  }
 
  ngOnInit(): void {
    this.loadBranches();
  }
 
  loadBranches(): void {
    this.loading = true;
    this.error = null;
    this.svc.getAll().subscribe({
      next: (data) => {
        this.branches = data;
        this.filterBranches();
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al cargar las sucursales';
        this.loading = false;
      }
    });
  }
 
  filterBranches(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredBranches = [...this.branches];
    } else {
      this.filteredBranches = this.branches.filter(b =>
        b.name.toLowerCase().includes(term) ||
        b.address.toLowerCase().includes(term) ||
        b.phone.toLowerCase().includes(term)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }
 
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredBranches.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedBranches = this.filteredBranches.slice(start, start + this.pageSize);
  }
 
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }
 
  goToFirstPage(): void { this.goToPage(1); }
  goToLastPage(): void { this.goToPage(this.totalPages); }
  goToPreviousPage(): void { this.goToPage(this.currentPage - 1); }
  goToNextPage(): void { this.goToPage(this.currentPage + 1); }
 
  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }
 
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end = Math.min(this.totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
 
  get startRecord(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }
 
  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredBranches.length);
  }
 
  openCreate(): void {
    this.form = { name: '', address: '', phone: '' };
    this.formError = null;
    this.modalMode = 'create';
  }
 
  openEdit(branch: Branch): void {
    this.selectedBranch = branch;
    this.form = { name: branch.name, address: branch.address, phone: branch.phone };
    this.formError = null;
    this.modalMode = 'edit';
  }
 
  closeModal(): void {
    this.modalMode = null;
    this.selectedBranch = null;
    this.formError = null;
  }
 
  saveForm(): void {
    if (!this.form.name.trim() || !this.form.address.trim() || !this.form.phone.trim()) {
      this.formError = 'Todos los campos son obligatorios.';
      return;
    }
    this.saving = true;
    this.formError = null;
 
    if (this.modalMode === 'create') {
      this.svc.create(this.form).subscribe({
        next: () => { this.saving = false; this.closeModal(); this.loadBranches(); },
        error: () => { this.formError = 'Error al crear la sucursal.'; this.saving = false; }
      });
    } else if (this.modalMode === 'edit' && this.selectedBranch) {
      this.svc.update(this.selectedBranch.id, this.form).subscribe({
        next: () => { this.saving = false; this.closeModal(); this.loadBranches(); },
        error: () => { this.formError = 'Error al actualizar la sucursal.'; this.saving = false; }
      });
    }
  }
 
  confirmDelete(id: number): void {
    this.deleteConfirmId = id;
  }
 
  cancelDelete(): void {
    this.deleteConfirmId = null;
  }
 
  deleteBranch(): void {
    if (this.deleteConfirmId === null) return;
    const id = this.deleteConfirmId;
    this.svc.delete(id).subscribe({
      next: () => { this.deleteConfirmId = null; this.loadBranches(); },
      error: () => { this.error = 'Error al eliminar la sucursal.'; this.deleteConfirmId = null; }
    });
  }
}