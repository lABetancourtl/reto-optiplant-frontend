import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category } from '../../services/admin/product.service';
import { CategoryService } from '../../services/admin/category.service';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriasComponent implements OnInit {
  categories: Category[] = [];
  filteredCategories: Category[] = [];
  paginatedCategories: Category[] = [];  // Categorias de la pagina actual
  searchTerm = '';
  loading = false;
  error = '';
  
  // Paginacion
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 1;
  
  // Modal state
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedCategory: Category | null = null;
  categoryName = '';
  
  // Delete confirmation
  showDeleteModal = false;
  categoryToDelete: Category | null = null;

  constructor(private categoryService: CategoryService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.error = '';
    
    this.categoryService.getAllCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.filterCategories();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las categorías';
        this.loading = false;
        console.error(err);
      }
    });
  }

  filterCategories(): void {
    if (!this.searchTerm.trim()) {
      this.filteredCategories = [...this.categories];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredCategories = this.categories.filter(category => 
        category.id.toString().includes(term) || 
        category.name.toLowerCase().includes(term)
      );
    }
    
    // Resetear a primera pagina al filtrar
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredCategories.length / this.pageSize) || 1;
    
    // Asegurar que la pagina actual sea valida
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCategories = this.filteredCategories.slice(startIndex, endIndex);
  }

  // Navegacion de paginacion
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages);
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  // Generar numeros de pagina para mostrar
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Informacion de rango actual
  get startRecord(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredCategories.length);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterCategories();
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.categoryName = '';
    this.selectedCategory = null;
    this.showModal = true;
  }

  openEditModal(category: Category): void {
    this.modalMode = 'edit';
    this.selectedCategory = category;
    this.categoryName = category.name;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.categoryName = '';
    this.selectedCategory = null;
  }

  saveCategory(): void {
    if (!this.categoryName.trim()) {
      return;
    }

    if (this.modalMode === 'create') {
      this.categoryService.createCategory(this.categoryName).subscribe({
        next: () => {
          this.loadCategories();
          this.closeModal();
        },
        error: (err) => {
          this.error = 'Error al crear la categoría';
          console.error(err);
        }
      });
    } else if (this.selectedCategory) {
      this.categoryService.updateCategory(this.selectedCategory.id, this.categoryName).subscribe({
        next: () => {
          this.loadCategories();
          this.closeModal();
        },
        error: (err) => {
          this.error = 'Error al actualizar la categoría';
          console.error(err);
        }
      });
    }
  }

  openDeleteModal(category: Category): void {
    this.categoryToDelete = category;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.categoryToDelete = null;
  }

  confirmDelete(): void {
    if (this.categoryToDelete) {
      this.categoryService.deleteCategory(this.categoryToDelete.id).subscribe({
        next: () => {
          this.loadCategories();
          this.closeDeleteModal();
        },
        error: (err) => {
          this.error = 'Error al eliminar la categoría';
          console.error(err);
        }
      });
    }
  }
}