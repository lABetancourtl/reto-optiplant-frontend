import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { enviroments } from '../../enviroments/enviroments';

export interface TransferEvent {
  transferId: number;
  type: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED';
  sourceBranchId: number;
  sourceBranchName: string;
  destBranchId: number;
  destBranchName: string;
  productName: string;
  quantity: number;
  trackingCode?: string;
  justification?: string;
}

export interface InventoryEvent {
  inventoryId: number;
  branchId: number;
  branchName: string;
  productId: number;
  productName: string;
  quantity: number;
  type: 'UPDATED' | 'TRANSFER_OUT' | 'TRANSFER_IN';
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client: Client;
  private connected = false;
  private subscriptions: StompSubscription[] = [];
  private pendingSubscriptions: (() => void)[] = [];

  private transferSubject = new Subject<TransferEvent>();
  private inventorySubject = new Subject<InventoryEvent>();

  transfers$ = this.transferSubject.asObservable();
  inventory$ = this.inventorySubject.asObservable();

  // Sets persistentes durante toda la sesión
  entrantesVistos = new Set<number>();
  salientesVistos = new Set<number>();

  private readonly wsUrl = enviroments.apiUrl.replace('/api', '').replace('http', 'ws') + '/ws/websocket';

  constructor() {
    this.client = new Client({
      brokerURL: this.wsUrl,
      reconnectDelay: 5000,
      onConnect: () => {
        this.connected = true;
        console.log('[WS] Conectado');
        // Ejecutar suscripciones pendientes
        this.pendingSubscriptions.forEach(fn => fn());
        this.pendingSubscriptions = [];
      },
      onDisconnect: () => {
        this.connected = false;
        console.log('[WS] Desconectado');
      },
      onStompError: (frame) => {
        console.error('[WS] Error STOMP:', frame);
      }
    });
  }

  connect(): void {
    if (!this.client.active) {
      this.client.activate();
    }
  }

  disconnect(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
    this.pendingSubscriptions = [];
    this.entrantesVistos.clear();
    this.salientesVistos.clear();
    if (this.client.active) {
      this.client.deactivate();
    }
  }

  subscribeToTransfersByBranch(branchId: number): void {
    this.subscribe(`/topic/transfers/branch/${branchId}`, (msg) => {
      this.transferSubject.next(JSON.parse(msg.body));
    });
  }

  subscribeToAllTransfers(): void {
    this.subscribe('/topic/transfers/admin', (msg) => {
      this.transferSubject.next(JSON.parse(msg.body));
    });
  }

  subscribeToInventoryByBranch(branchId: number): void {
    this.subscribe(`/topic/inventory/branch/${branchId}`, (msg) => {
      this.inventorySubject.next(JSON.parse(msg.body));
    });
  }

  subscribeToAllInventory(): void {
    this.subscribe('/topic/inventory/all', (msg) => {
      this.inventorySubject.next(JSON.parse(msg.body));
    });
  }

  private subscribe(topic: string, callback: (msg: IMessage) => void): void {
    const doSubscribe = () => {
      const sub = this.client.subscribe(topic, callback);
      this.subscriptions.push(sub);
    };

    if (this.connected) {
      doSubscribe();
    } else {
      this.pendingSubscriptions.push(doSubscribe);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}