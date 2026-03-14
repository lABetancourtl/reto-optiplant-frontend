import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SucursalDetalleComponent } from './sucursal-detalle.component';

describe('SucursalDetalleComponent', () => {
  let component: SucursalDetalleComponent;
  let fixture: ComponentFixture<SucursalDetalleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SucursalDetalleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SucursalDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
