import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchOperationsService } from '../../services/sucursal/branch-operations.service';
import { SaleSummary } from '../../models/branch-operations.models';
import { getApiErrorMessage } from '../../shared/utils/api-error.util';
import { Product, ProductService } from '../../services/admin/product.service';
import { SucursalInventarioService } from '../../services/sucursal/inventario.service';

@Component({
  selector: 'app-ventas',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css'
})
export class VentasComponent implements OnInit {
  private readonly paymentMethodLabels = new Set(['MOSTRADOR', 'EFECTIVO', 'TARJETA', 'TRANSFERENCIA']);
  private readonly pageSizeStorageKey = 'sucursal.ventas.pageSize';

  saleForm: FormGroup;
  products: Product[] = [];
  branchStockByProductId = new Map<number, number>();
  loadingProducts = false;
  loadingStock = false;
  sales: SaleSummary[] = [];
  paginatedSales: SaleSummary[] = [];
  loadingSales = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 1;

  constructor(
    private fb: FormBuilder,
    private branchOperationsService: BranchOperationsService,
    private productService: ProductService,
    private sucursalInventarioService: SucursalInventarioService
  ) {
    this.saleForm = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      paymentMethod: ['MOSTRADOR'],
      items: this.fb.array([this.createItemGroup()])
    });
  }

  ngOnInit(): void {
    this.restorePageSizePreference();
    this.loadBranchStock();
    this.loadProducts();
    this.loadSales();
  }

  private restorePageSizePreference(): void {
    const stored = sessionStorage.getItem(this.pageSizeStorageKey);
    const parsed = Number(stored);
    if (Number.isFinite(parsed) && this.pageSizeOptions.includes(parsed)) {
      this.pageSize = parsed;
    }
  }

  private persistPageSizePreference(): void {
    sessionStorage.setItem(this.pageSizeStorageKey, String(this.pageSize));
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

  get saleTotal(): number {
    return this.items.controls.reduce((acc, control) => {
      const quantity = Number(control.get('quantity')?.value ?? 0);
      const unitPrice = Number(control.get('unitPrice')?.value ?? 0);
      return acc + (quantity * unitPrice);
    }, 0);
  }

  get canSubmitSale(): boolean {
    return this.saleForm.valid
      && !this.submitting
      && !this.loadingProducts
      && !this.loadingStock
      && !this.hasInvalidProductPrices
      && !this.hasOutOfStockItems;
  }

  get hasInvalidProductPrices(): boolean {
    return this.items.controls.some((control) => Number(control.get('unitPrice')?.value ?? 0) <= 0);
  }

  get hasOutOfStockItems(): boolean {
    return this.items.controls.some((control) => {
      const productId = Number(control.get('productId')?.value ?? 0);
      if (!productId) {
        return false;
      }

      return this.getAvailableStockByProductId(productId) <= 0;
    });
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

  onProductChange(index: number): void {
    const item = this.items.at(index) as FormGroup;
    const productId = Number(item.get('productId')?.value);
    const selected = this.products.find((product) => product.id === productId);
    if (!selected) {
      item.patchValue({ unitPrice: 0 }, { emitEvent: false });
      return;
    }

    item.patchValue({ unitPrice: selected.price ?? 0, productSearch: selected.name ?? '' }, { emitEvent: false });
  }

  onProductSearchApply(index: number): void {
    const item = this.items.at(index) as FormGroup;
    const term = String(item.get('productSearch')?.value ?? '').trim();

    if (!term) {
      item.patchValue({ productId: null, unitPrice: 0 }, { emitEvent: false });
      item.get('productId')?.markAsTouched();
      return;
    }

    const normalizedTerm = term.toLowerCase();

    const exactMatch = this.products.find((product) =>
      product.name.trim().toLowerCase() === normalizedTerm ||
      String(product.id) === normalizedTerm
    );

    const containsMatch = this.products.find((product) =>
      product.name.toLowerCase().includes(normalizedTerm) ||
      String(product.id).includes(normalizedTerm)
    );

    const selected = exactMatch ?? containsMatch;

    if (!selected) {
      item.patchValue({ productId: null, unitPrice: 0 }, { emitEvent: false });
      item.get('productId')?.markAsTouched();
      return;
    }

    item.patchValue(
      { productId: selected.id, unitPrice: selected.price ?? 0, productSearch: selected.name },
      { emitEvent: false }
    );
    item.get('productId')?.markAsTouched();
  }

  getItemSubtotal(index: number): number {
    const item = this.items.at(index) as FormGroup;
    const quantity = Number(item.get('quantity')?.value ?? 0);
    const unitPrice = Number(item.get('unitPrice')?.value ?? 0);
    return quantity * unitPrice;
  }

  submitSale(): void {
    if (this.hasOutOfStockItems) {
      this.errorMessage = 'No se puede registrar la venta porque uno o más productos no tienen stock disponible en la sucursal.';
      return;
    }

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
        this.loadBranchStock();
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
        this.currentPage = 1;
        this.updatePagination();
      },
      error: (error) => {
        this.errorMessage = getApiErrorMessage(error, 'No se pudieron cargar las ventas de la sucursal.');
      },
      complete: () => {
        this.loadingSales = false;
      }
    });
  }

  loadProducts(): void {
    this.loadingProducts = true;
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
      },
      error: (error) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.loadProductsFromBranchInventory();
          return;
        }

        this.errorMessage = getApiErrorMessage(error, 'No se pudieron cargar los productos para registrar la venta.');
        this.loadingProducts = false;
      },
      complete: () => {
        this.loadingProducts = false;
      }
    });
  }

  private loadBranchStock(): void {
    this.loadingStock = true;
    this.sucursalInventarioService.getMyBranchInventory().subscribe({
      next: (inventory) => {
        const stockMap = new Map<number, number>();

        inventory.forEach((item) => {
          const productId = item.product?.id;
          if (!productId) {
            return;
          }

          const currentQuantity = stockMap.get(productId) ?? 0;
          stockMap.set(productId, currentQuantity + Number(item.quantity ?? 0));
        });

        this.branchStockByProductId = stockMap;
      },
      error: () => {
        this.branchStockByProductId = new Map<number, number>();
      },
      complete: () => {
        this.loadingStock = false;
      }
    });
  }

  private loadProductsFromBranchInventory(): void {
    this.sucursalInventarioService.getMyBranchInventory().subscribe({
      next: (inventory) => {
        const uniqueProducts = new Map<number, Product>();
        const stockMap = new Map<number, number>();

        inventory.forEach((item) => {
          if (!item.product?.id || uniqueProducts.has(item.product.id)) {
            const currentQuantity = stockMap.get(item.product?.id ?? 0) ?? 0;
            if (item.product?.id) {
              stockMap.set(item.product.id, currentQuantity + Number(item.quantity ?? 0));
            }
            return;
          }

          uniqueProducts.set(item.product.id, {
            id: item.product.id,
            name: item.product.name,
            description: '',
            price: Number(item.product.price ?? 0),
            category: item.product.category
              ? { id: item.product.category.id, name: item.product.category.name }
              : null
          });

          stockMap.set(item.product.id, Number(item.quantity ?? 0));
        });

        this.products = Array.from(uniqueProducts.values()).sort((a, b) => a.name.localeCompare(b.name));
        this.branchStockByProductId = stockMap;
      },
      error: (inventoryError) => {
        this.errorMessage = getApiErrorMessage(inventoryError, 'No se pudieron cargar productos para registrar la venta.');
      },
      complete: () => {
        this.loadingProducts = false;
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

  asCustomerName(value?: string): string {
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

  getAvailableStock(index: number): number | null {
    const item = this.items.at(index) as FormGroup;
    const productId = Number(item.get('productId')?.value ?? 0);

    if (!productId) {
      return null;
    }

    return this.getAvailableStockByProductId(productId);
  }

  private getAvailableStockByProductId(productId: number): number {
    return Number(this.branchStockByProductId.get(productId) ?? 0);
  }

  updatePagination(): void {
    const safePageSize = Number(this.pageSize) || 10;
    this.pageSize = safePageSize;

    this.totalPages = Math.ceil(this.sales.length / safePageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * safePageSize;
    const endIndex = startIndex + safePageSize;
    this.paginatedSales = this.sales.slice(startIndex, endIndex);
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

  onPageSizeChange(size?: number | string): void {
    if (size !== undefined) {
      this.pageSize = Number(size) || this.pageSizeOptions[0];
    }
    this.persistPageSizePreference();
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
    if (this.sales.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.sales.length);
  }

  private createItemGroup(): FormGroup {
    return this.fb.group({
      productSearch: [''],
      productId: [null, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0.01)]]
    });
  }
}
