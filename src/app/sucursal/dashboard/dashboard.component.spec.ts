import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { BranchOperationsService } from '../../services/sucursal/branch-operations.service';
import { SucursalInventarioService } from '../../services/sucursal/inventario.service';
import { TransferService } from '../../services/sucursal/trasnfer.servic';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        {
          provide: BranchOperationsService,
          useValue: {
            getMySales: () => of([])
          }
        },
        {
          provide: TransferService,
          useValue: {
            getMyTransfers: () => of([])
          }
        },
        {
          provide: SucursalInventarioService,
          useValue: {
            getMyBranchInventory: () => of([])
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
