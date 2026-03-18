import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbastecimientoComponent } from './abastecimiento.component';

describe('AbastecimientoComponent', () => {
  let component: AbastecimientoComponent;
  let fixture: ComponentFixture<AbastecimientoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbastecimientoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbastecimientoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
