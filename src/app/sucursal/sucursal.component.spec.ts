import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SucursalComponent } from './sucursal.component';

describe('SucursalComponent', () => {
  let component: SucursalComponent;
  let fixture: ComponentFixture<SucursalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SucursalComponent,
        RouterTestingModule   // necesario si usas Router o RouterOutlet en el template
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SucursalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default sidebarCollapsed as false', () => {
    expect(component.sidebarCollapsed).toBeFalse();
  });

  it('should toggle sidebar collapsed state', () => {
    component.toggleSidebar();
    expect(component.sidebarCollapsed).toBeTrue();
  });

  it('should open and close mobile sidebar', () => {
    component.toggleMobileSidebar();
    expect(component.sidebarMobileOpen).toBeTrue();
    component.closeMobileSidebar();
    expect(component.sidebarMobileOpen).toBeFalse();
  });
});