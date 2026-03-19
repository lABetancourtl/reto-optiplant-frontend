import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { InventarioComponent } from './inventario.component';
import { InventarioService } from '../../services/admin/inventario.service';
import { SucursalesService } from '../../services/admin/sucursal.service';
import { WebSocketService } from '../../services/websocket.service';

describe('InventarioComponent', () => {
  let component: InventarioComponent;
  let fixture: ComponentFixture<InventarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventarioComponent],
      providers: [
        {
          provide: InventarioService,
          useValue: {
            getAll: () => of([]),
            getByBranch: () => of([]),
            create: () => of({}),
            update: () => of({}),
            delete: () => of(undefined)
          }
        },
        {
          provide: SucursalesService,
          useValue: {
            getAll: () => of([])
          }
        },
        {
          provide: WebSocketService,
          useValue: {
            connect: () => undefined,
            subscribeToAllInventory: () => undefined,
            inventory$: of()
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
