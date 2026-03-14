import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product, Category } from '../../services/product.service';

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
  categories: Category[] = [];
  selectedProduct: Product | null = null;
  
  searchId: number | null = null;
  filterText: string = '';
  selectedCategoryId: number | null = null;
  
  loading = false;
  error: string | null = null;

  // Paginación
  currentPage = 1;
  pageSize = 25;

  // Ordenamiento
  sortColumn: string = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';

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
    this.error = null;
    this.selectedProduct = null;

    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.applyFilter();
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
    this.error = null;
    this.selectedProduct = null;

    this.productService.getProductsByCategory(categoryId).subscribe({
      next: (data) => {
        this.products = data;
        this.applyFilter();
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

  searchById(): void {
    if (!this.searchId) {
      this.error = 'Ingresa un ID válido';
      return;
    }

    this.loading = true;
    this.error = null;

    this.productService.getProductById(this.searchId).subscribe({
      next: (data) => {
        this.selectedProduct = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = `Producto con ID ${this.searchId} no encontrado`;
        this.loading = false;
        console.error(err);
      }
    });
  }

  viewProduct(product: Product): void {
    this.selectedProduct = product;
  }

  clearSelection(): void {
    this.selectedProduct = null;
    this.searchId = null;
  }

  clearFilters(): void {
    this.filterText = '';
    this.selectedCategoryId = null;
    this.searchId = null;
    this.selectedProduct = null;
    this.loadAllProducts();
  }

  applyFilter(): void {
    this.currentPage = 1;
    if (!this.filterText.trim()) {
      this.filteredProducts = [...this.products];
    } else {
      const filter = this.filterText.toLowerCase();
      this.filteredProducts = this.products.filter(p => 
        p.name.toLowerCase().includes(filter) ||
        p.description?.toLowerCase().includes(filter)
      );
    }
    this.applySorting();
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySorting();
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

  // Paginación
  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.pageSize);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.filteredProducts.length);
  }

  get paginatedProducts(): Product[] {
    return this.filteredProducts.slice(this.startIndex, this.endIndex);
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }
}