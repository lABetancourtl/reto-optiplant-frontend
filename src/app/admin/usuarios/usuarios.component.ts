import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Branch, SucursalUser, UsuariosService } from '../../services/admin/usuarios.service';


type ModalMode = 'create' | 'edit' | null;
 
interface UserForm {
  userName: string;
  name: string;
  password: string;
  branchId: number | null;
}
 
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent implements OnInit {
 
  users: SucursalUser[] = [];
  filteredUsers: SucursalUser[] = [];
  paginatedUsers: SucursalUser[] = [];
  branches: Branch[] = [];
 
  searchTerm = '';
  loading = false;
  error: string | null = null;
 
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 1;
 
  modalMode: ModalMode = null;
  selectedUser: SucursalUser | null = null;
  form: UserForm = { userName: '', name: '', password: '', branchId: null };
  formError: string | null = null;
  saving = false;
  showPassword = false;
 
  deleteConfirmId: number | null = null;
 
  constructor(private svc: UsuariosService) {}
 
  ngOnInit(): void {
    this.loadUsers();
    this.loadBranches();
  }
 
  loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.svc.getAll().subscribe({
      next: (data) => { this.users = data; this.filterUsers(); this.loading = false; },
      error: () => { this.error = 'Error al cargar los usuarios'; this.loading = false; }
    });
  }
 
  loadBranches(): void {
    this.svc.getBranches().subscribe({
      next: (data) => this.branches = data,
      error: (err) => console.error('Error cargando sucursales:', err)
    });
  }
 
  filterUsers(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredUsers = !term ? [...this.users] : this.users.filter(u =>
      u.username.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      (u.branchName ?? '').toLowerCase().includes(term)
    );
    this.currentPage = 1;
    this.updatePagination();
  }
 
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(start, start + this.pageSize);
  }
 
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) { this.currentPage = page; this.updatePagination(); }
  }
 
  goToFirstPage(): void { this.goToPage(1); }
  goToLastPage(): void { this.goToPage(this.totalPages); }
  goToPreviousPage(): void { this.goToPage(this.currentPage - 1); }
  goToNextPage(): void { this.goToPage(this.currentPage + 1); }
 
  onPageSizeChange(): void { this.currentPage = 1; this.updatePagination(); }
 
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end = Math.min(this.totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
 
  get startRecord(): number { return (this.currentPage - 1) * this.pageSize + 1; }
  get endRecord(): number { return Math.min(this.currentPage * this.pageSize, this.filteredUsers.length); }
 
  openCreate(): void {
    this.form = { userName: '', name: '', password: '', branchId: null };
    this.formError = null;
    this.showPassword = false;
    this.modalMode = 'create';
  }
 
  openEdit(user: SucursalUser): void {
    this.formError = null;
    this.showPassword = false;
    this.selectedUser = user;
    this.form = {
      userName: user.username ?? '',
      name: user.name ?? '',
      password: '',
      branchId: user.branchId ?? null
    };
    this.modalMode = 'edit';
  }
 
  closeModal(): void { this.modalMode = null; this.selectedUser = null; this.formError = null; }
 
  isFormValid(): boolean {
    if (!this.form?.userName?.trim() || !this.form?.name?.trim()) return false;
    if (this.modalMode === 'create' && !this.form?.password?.trim()) return false;
    return true;
  }
 
  saveForm(): void {
    if (!this.isFormValid()) {
      this.formError = this.modalMode === 'create'
        ? 'Usuario, nombre y contraseña son obligatorios.'
        : 'Usuario y nombre son obligatorios.';
      return;
    }
    this.saving = true;
    this.formError = null;
 
    if (this.modalMode === 'create') {
      this.svc.create({ userName: this.form.userName.trim(), name: this.form.name.trim(), password: this.form.password, branchId: this.form.branchId }).subscribe({
        next: () => { this.saving = false; this.closeModal(); this.loadUsers(); },
        error: () => { this.formError = 'Error al crear el usuario.'; this.saving = false; }
      });
    } else if (this.modalMode === 'edit' && this.selectedUser) {
      const req: any = { userName: this.form.userName.trim(), name: this.form.name.trim(), branchId: this.form.branchId };
      if (this.form.password.trim()) req.password = this.form.password;
      this.svc.update(this.selectedUser.id, req).subscribe({
        next: () => { this.saving = false; this.closeModal(); this.loadUsers(); },
        error: () => { this.formError = 'Error al actualizar el usuario.'; this.saving = false; }
      });
    }
  }
 
  confirmDelete(id: number): void { this.deleteConfirmId = id; }
  cancelDelete(): void { this.deleteConfirmId = null; }
 
  get userToDelete(): SucursalUser | undefined {
    return this.users.find(u => u.id === this.deleteConfirmId);
  }
 
  deleteUser(): void {
    if (this.deleteConfirmId === null) return;
    const id = this.deleteConfirmId;
    this.svc.delete(id).subscribe({
      next: () => { this.deleteConfirmId = null; this.loadUsers(); },
      error: () => { this.error = 'Error al eliminar el usuario.'; this.deleteConfirmId = null; }
    });
  }
}