import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Branch, SucursalesService } from '../../../services/sucursal.service';
import { SucursalUser, UsuariosService } from '../../../services/usuarios.service';
import { InventarioService, InventoryItem } from '../../../services/inventario.service';

type UserModalMode = 'create' | 'edit' | null;
type InventoryModalMode = 'create' | 'edit' | null;
type ActiveTab = 'usuarios' | 'inventario';

interface UserForm {
  userName: string;
  name: string;
  password: string;
}

interface InventoryForm {
  productId: number | null;
  quantity: number | null;
}

@Component({
  selector: 'app-sucursal-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sucursal-detalle.component.html',
  styleUrl: './sucursal-detalle.component.css'
})
export class SucursalDetalleComponent implements OnInit {

  branch: Branch | null = null;
  loadingBranch = false;
  branchError: string | null = null;

  editingBranch = false;
  branchForm = { name: '', address: '', phone: '' };
  savingBranch = false;
  branchFormError: string | null = null;

  // ── Tabs ──
  activeTab: ActiveTab = 'usuarios';

  // ── Usuarios ──
  users: SucursalUser[] = [];
  filteredUsers: SucursalUser[] = [];
  loadingUsers = false;
  usersError: string | null = null;
  searchTerm = '';

  userModalMode: UserModalMode = null;
  selectedUser: SucursalUser | null = null;
  userForm: UserForm = { userName: '', name: '', password: '' };
  userFormError: string | null = null;
  savingUser = false;
  showPassword = false;
  deleteConfirmId: number | null = null;

  // ── Inventario ──
  inventory: InventoryItem[] = [];
  filteredInventory: InventoryItem[] = [];
  loadingInventory = false;
  inventoryError: string | null = null;
  inventorySearchTerm = '';

  inventoryModalMode: InventoryModalMode = null;
  selectedInventoryItem: InventoryItem | null = null;
  inventoryForm: InventoryForm = { productId: null, quantity: null };
  inventoryFormError: string | null = null;
  savingInventory = false;
  deleteInventoryConfirmId: number | null = null;

  private branchId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sucursalesService: SucursalesService,
    private usuariosService: UsuariosService,
    private inventarioService: InventarioService
  ) {}

  ngOnInit(): void {
    this.branchId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadBranch();
    this.loadUsers();
    this.loadInventory();
  }

  goBack(): void {
    this.router.navigate(['/admin/sucursales']);
  }

  setTab(tab: ActiveTab): void {
    this.activeTab = tab;
  }

  // ── Branch ──
  loadBranch(): void {
    this.loadingBranch = true;
    this.sucursalesService.getById(this.branchId).subscribe({
      next: (data) => { this.branch = data; this.loadingBranch = false; },
      error: () => { this.branchError = 'Error al cargar la sucursal.'; this.loadingBranch = false; }
    });
  }

  startEditBranch(): void {
    if (!this.branch) return;
    this.branchForm = { name: this.branch.name, address: this.branch.address, phone: this.branch.phone };
    this.branchFormError = null;
    this.editingBranch = true;
  }

  cancelEditBranch(): void {
    this.editingBranch = false;
    this.branchFormError = null;
  }

  saveBranch(): void {
    if (!this.branchForm.name.trim() || !this.branchForm.address.trim() || !this.branchForm.phone.trim()) {
      this.branchFormError = 'Todos los campos son obligatorios.';
      return;
    }
    this.savingBranch = true;
    this.branchFormError = null;
    this.sucursalesService.update(this.branchId, this.branchForm).subscribe({
      next: (updated) => { this.branch = updated; this.editingBranch = false; this.savingBranch = false; },
      error: () => { this.branchFormError = 'Error al actualizar la sucursal.'; this.savingBranch = false; }
    });
  }

  // ── Usuarios ──
  loadUsers(): void {
    this.loadingUsers = true;
    this.usersError = null;
    this.usuariosService.getAll().subscribe({
      next: (data) => {
        this.users = data.filter(u => u.branchId === this.branchId);
        this.filterUsers();
        this.loadingUsers = false;
      },
      error: () => { this.usersError = 'Error al cargar los usuarios.'; this.loadingUsers = false; }
    });
  }

  filterUsers(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredUsers = !term ? [...this.users] : this.users.filter(u =>
      u.username.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term)
    );
  }

  openCreateUser(): void {
    this.userForm = { userName: '', name: '', password: '' };
    this.userFormError = null;
    this.showPassword = false;
    this.userModalMode = 'create';
  }

  openEditUser(user: SucursalUser): void {
    this.userFormError = null;
    this.showPassword = false;
    this.selectedUser = user;
    this.userForm = { userName: user.username ?? '', name: user.name ?? '', password: '' };
    this.userModalMode = 'edit';
  }

  closeUserModal(): void {
    this.userModalMode = null;
    this.selectedUser = null;
    this.userFormError = null;
  }

  isUserFormValid(): boolean {
    if (!this.userForm?.userName?.trim() || !this.userForm?.name?.trim()) return false;
    if (this.userModalMode === 'create' && !this.userForm?.password?.trim()) return false;
    return true;
  }

  saveUser(): void {
    if (!this.isUserFormValid()) {
      this.userFormError = this.userModalMode === 'create'
        ? 'Usuario, nombre y contraseña son obligatorios.'
        : 'Usuario y nombre son obligatorios.';
      return;
    }
    this.savingUser = true;
    this.userFormError = null;

    if (this.userModalMode === 'create') {
      this.usuariosService.create({
        userName: this.userForm.userName.trim(),
        name: this.userForm.name.trim(),
        password: this.userForm.password,
        branchId: this.branchId
      }).subscribe({
        next: () => { this.savingUser = false; this.closeUserModal(); this.loadUsers(); },
        error: () => { this.userFormError = 'Error al crear el usuario.'; this.savingUser = false; }
      });
    } else if (this.userModalMode === 'edit' && this.selectedUser) {
      const req: any = {
        userName: this.userForm.userName.trim(),
        name: this.userForm.name.trim(),
        branchId: this.branchId
      };
      if (this.userForm.password.trim()) req.password = this.userForm.password;
      this.usuariosService.update(this.selectedUser.id, req).subscribe({
        next: () => { this.savingUser = false; this.closeUserModal(); this.loadUsers(); },
        error: () => { this.userFormError = 'Error al actualizar el usuario.'; this.savingUser = false; }
      });
    }
  }

  confirmDeleteUser(id: number): void { this.deleteConfirmId = id; }
  cancelDeleteUser(): void { this.deleteConfirmId = null; }

  get userToDelete(): SucursalUser | undefined {
    return this.users.find(u => u.id === this.deleteConfirmId);
  }

  deleteUser(): void {
    if (this.deleteConfirmId === null) return;
    const id = this.deleteConfirmId;
    this.usuariosService.delete(id).subscribe({
      next: () => { this.deleteConfirmId = null; this.loadUsers(); },
      error: () => { this.usersError = 'Error al eliminar el usuario.'; this.deleteConfirmId = null; }
    });
  }

  // ── Inventario ──
  loadInventory(): void {
    this.loadingInventory = true;
    this.inventoryError = null;
    this.inventarioService.getByBranch(this.branchId).subscribe({
      next: (data) => {
        this.inventory = data;
        this.filterInventory();
        this.loadingInventory = false;
      },
      error: () => { this.inventoryError = 'Error al cargar el inventario.'; this.loadingInventory = false; }
    });
  }

  filterInventory(): void {
    const term = this.inventorySearchTerm.toLowerCase().trim();
    this.filteredInventory = !term ? [...this.inventory] : this.inventory.filter(item =>
      item.product.name.toLowerCase().includes(term)
    );
  }

  openEditInventory(item: InventoryItem): void {
    this.selectedInventoryItem = item;
    this.inventoryForm = { productId: item.product.id, quantity: item.quantity };
    this.inventoryFormError = null;
    this.inventoryModalMode = 'edit';
  }

  closeInventoryModal(): void {
    this.inventoryModalMode = null;
    this.selectedInventoryItem = null;
    this.inventoryFormError = null;
  }

  isInventoryFormValid(): boolean {
    return this.inventoryForm.quantity !== null && this.inventoryForm.quantity >= 0;
  }

  saveInventory(): void {
    if (!this.isInventoryFormValid()) {
      this.inventoryFormError = 'La cantidad es obligatoria y debe ser mayor o igual a 0.';
      return;
    }
    if (!this.selectedInventoryItem) return;

    this.savingInventory = true;
    this.inventoryFormError = null;

    this.inventarioService.update(this.selectedInventoryItem.id, { quantity: this.inventoryForm.quantity! }).subscribe({
      next: () => { this.savingInventory = false; this.closeInventoryModal(); this.loadInventory(); },
      error: () => { this.inventoryFormError = 'Error al actualizar el inventario.'; this.savingInventory = false; }
    });
  }

  confirmDeleteInventory(id: number): void { this.deleteInventoryConfirmId = id; }
  cancelDeleteInventory(): void { this.deleteInventoryConfirmId = null; }

  get inventoryItemToDelete(): InventoryItem | undefined {
    return this.inventory.find(i => i.id === this.deleteInventoryConfirmId);
  }

  deleteInventory(): void {
    if (this.deleteInventoryConfirmId === null) return;
    const id = this.deleteInventoryConfirmId;
    this.inventarioService.delete(id).subscribe({
      next: () => { this.deleteInventoryConfirmId = null; this.loadInventory(); },
      error: () => { this.inventoryError = 'Error al eliminar el item del inventario.'; this.deleteInventoryConfirmId = null; }
    });
  }

  getStockClass(quantity: number): string {
    if (quantity === 0) return 'stock-empty';
    if (quantity <= 5) return 'stock-low';
    return 'stock-ok';
  }

  getStockLabel(quantity: number): string {
    if (quantity === 0) return 'Sin stock';
    if (quantity <= 5) return 'Stock bajo';
    return 'En stock';
  }
}