import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product, Category } from '../../services/admin/product.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  paginatedProducts: Product[] = [];
  categories: Category[] = [];
  
  searchTerm = '';
  selectedCategoryId: number | null = null;
  
  loading = false;
  error = '';

  // Paginacion
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 1;

  // Ordenamiento
  sortColumn = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Modal Create/Edit
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedProduct: Product | null = null;
  
  // Form fields
  productName = '';
  productDescription = '';
  productPrice: number | null = null;
  productCategoryId: number | null = null;

  // Delete modal
  showDeleteModal = false;
  productToDelete: Product | null = null;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadAllProducts();
  }

  loadCategories(): void {
    this.productService.getAllCategories().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (err) => {
        console.error('Error al cargar categorías', err);
      }
    });
  }

  loadAllProducts(): void {
    this.loading = true;
    this.error = '';

    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.filterProducts();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los productos';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadProductsByCategory(categoryId: number): void {
    this.loading = true;
    this.error = '';

    this.productService.getProductsByCategory(categoryId).subscribe({
      next: (data) => {
        this.products = data;
        this.filterProducts();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los productos de esta categoría';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onCategoryChange(): void {
    if (this.selectedCategoryId) {
      this.loadProductsByCategory(this.selectedCategoryId);
    } else {
      this.loadAllProducts();
    }
  }

  getSelectedCategoryName(): string {
    const category = this.categories.find(c => c.id == this.selectedCategoryId);
    return category ? category.name : '';
  }

  getCategoryName(categoryId: number | null): string {
    if (!categoryId) return '';
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : '';
  }

  filterProducts(): void {
    let result = [...this.products];

    // Filtrar por texto
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(p =>
        p.id.toString().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    this.filteredProducts = result;
    this.applySorting();
    this.currentPage = 1;
    this.updatePagination();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterProducts();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategoryId = null;
    this.loadAllProducts();
  }

  // Ordenamiento
  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySorting();
    this.updatePagination();
  }

  applySorting(): void {
    this.filteredProducts.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      if (this.sortColumn === 'category') {
        valueA = a.category?.name?.toLowerCase() || '';
        valueB = b.category?.name?.toLowerCase() || '';
      } else {
        valueA = (a as any)[this.sortColumn];
        valueB = (b as any)[this.sortColumn];
      }

      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB?.toLowerCase() || '';
      }

      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  // Paginacion
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredProducts.length / this.pageSize) || 1;
    
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);
  }

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

  get startRecord(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredProducts.length);
  }

  // CRUD Modal handlers
  openCreateModal(): void {
    this.modalMode = 'create';
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(product: Product): void {
    this.modalMode = 'edit';
    this.selectedProduct = product;
    this.productName = product.name;
    this.productDescription = product.description;
    this.productPrice = product.price;
    this.productCategoryId = product.category?.id || null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.productName = '';
    this.productDescription = '';
    this.productPrice = null;
    this.productCategoryId = null;
    this.selectedProduct = null;
  }

  isFormValid(): boolean {
    return !!(
      this.productName.trim() &&
      this.productPrice !== null &&
      this.productPrice >= 0
    );
  }

  saveProduct(): void {
    if (!this.isFormValid()) {
      return;
    }

    const request = {
      name: this.productName,
      description: this.productDescription,
      price: this.productPrice!,
      categoryId: this.productCategoryId
    };

    if (this.modalMode === 'create') {
      this.productService.createProduct(request).subscribe({
        next: () => {
          this.loadAllProducts();
          this.closeModal();
        },
        error: (err) => {
          this.error = 'Error al crear el producto';
          console.error(err);
        }
      });
    } else if (this.selectedProduct) {
      this.productService.updateProduct(this.selectedProduct.id, request).subscribe({
        next: () => {
          this.loadAllProducts();
          this.closeModal();
        },
        error: (err) => {
          this.error = 'Error al actualizar el producto';
          console.error(err);
        }
      });
    }
  }

  // Delete handlers
  openDeleteModal(product: Product): void {
    this.productToDelete = product;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  confirmDelete(): void {
    if (this.productToDelete) {
      this.productService.deleteProduct(this.productToDelete.id).subscribe({
        next: () => {
          this.loadAllProducts();
          this.closeDeleteModal();
        },
        error: (err) => {
          this.error = 'Error al eliminar el producto';
          console.error(err);
        }
      });
    }
  }
}