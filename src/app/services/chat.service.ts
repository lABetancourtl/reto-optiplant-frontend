import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, Subject, Subscription } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import {
  ChatConversationResponse,
  ChatMessageResponse,
  CreateChatMessageRequest
} from '../models/chat.models';
import { enviroments } from '../../enviroments/enviroments';

interface CreateAdminConversationRequest {
  branchId: number;
}

interface CreateBranchConversationRequest {
  sourceBranchId: number;
  destinationBranchId: number;
}

interface PagedMessagesResponse {
  content: ChatMessageResponse[];
}

export type ChatWsConnectionState = 'connected' | 'reconnecting' | 'disconnected';

/**
 * Servicio para gestión de chat en tiempo real y por REST.
 * Permite crear conversaciones, enviar y recibir mensajes,
 * y manejar la conexión WebSocket para chat en sucursales/admin.
 */
@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private readonly apiUrl = `${enviroments.apiUrl}/chat`;
  private readonly wsUrls = this.buildWsUrls();

  private client: Client | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private manualDisconnect = false;
  private currentToken: string | null = null;
  private wsUrlIndex = 0;

  private readonly connectionStateSubject = new BehaviorSubject<ChatWsConnectionState>('disconnected');
  readonly connectionState$ = this.connectionStateSubject.asObservable();

  private readonly conversationSubjects = new Map<number, Subject<ChatMessageResponse>>();
  private readonly conversationSubscriptions = new Map<number, StompSubscription>();
  private readonly fallbackSubscriptions: Subscription[] = [];

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene todas las conversaciones disponibles para el usuario.
   */
  getConversations(): Observable<ChatConversationResponse[]> {
    return this.http.get<ChatConversationResponse[]>(`${this.apiUrl}/conversations`);
  }

  /**
   * Obtiene los mensajes de una conversación paginados.
   * @param conversationId ID de la conversación.
   * @param page Página de mensajes.
   * @param size Cantidad de mensajes por página.
   */
  getMessages(conversationId: number, page = 0, size = 50): Observable<ChatMessageResponse[]> {
    return this.http
      .get<ChatMessageResponse[] | PagedMessagesResponse>(
        `${this.apiUrl}/conversations/${conversationId}/messages?page=${page}&size=${size}`
      )
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }
          return response.content ?? [];
        })
      );
  }

  /**
   * Crea una conversación entre admin y sucursal.
   * @param branchId ID de la sucursal.
   */
  createAdminConversation(branchId: number): Observable<ChatConversationResponse> {
    const payload: CreateAdminConversationRequest = { branchId };
    return this.http.post<ChatConversationResponse>(`${this.apiUrl}/conversations/admin-branch`, payload);
  }

  /**
   * Crea una conversación entre dos sucursales.
   * @param sourceBranchId ID de la sucursal origen.
   * @param destinationBranchId ID de la sucursal destino.
   */
  createBranchConversation(sourceBranchId: number, destinationBranchId: number): Observable<ChatConversationResponse> {
    const payload: CreateBranchConversationRequest = { sourceBranchId, destinationBranchId };
    return this.http.post<ChatConversationResponse>(`${this.apiUrl}/conversations/branch-branch`, payload);
  }

  /**
   * Envía un mensaje a una conversación usando REST.
   * @param conversationId ID de la conversación.
   * @param content Contenido del mensaje.
   */
  sendMessageRest(conversationId: number, content: string): Observable<ChatMessageResponse> {
    const payload: CreateChatMessageRequest = { conversationId, content };
    return this.http.post<ChatMessageResponse>(`${this.apiUrl}/messages`, payload);
  }

  /**
   * Conecta el servicio de chat por WebSocket usando el token JWT.
   * @param token Token JWT.
   */
  connectWs(token: string): void {
    if (!token) {
      this.connectionStateSubject.next('disconnected');
      return;
    }

    this.currentToken = token;
    this.manualDisconnect = false;

    if (this.client?.active) {
      return;
    }

    this.createClient(token, this.wsUrls[this.wsUrlIndex]);
    this.client?.activate();
  }

  /**
   * Desconecta el servicio de chat WebSocket y limpia recursos.
   */
  disconnectWs(): void {
    this.manualDisconnect = true;
    this.currentToken = null;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.conversationSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.conversationSubscriptions.clear();

    this.fallbackSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.fallbackSubscriptions.length = 0;

    if (this.client?.active) {
      void this.client.deactivate();
    }
    this.client = null;
    this.connectionStateSubject.next('disconnected');
  }

  /**
   * Suscribe a mensajes de una conversación por WebSocket.
   * @param conversationId ID de la conversación.
   */
  subscribeConversation(conversationId: number): Observable<ChatMessageResponse> {
    const subject = this.getOrCreateConversationSubject(conversationId);
    this.ensureConversationSubscription(conversationId);
    return subject.asObservable();
  }

  /**
   * Envía un mensaje a una conversación por WebSocket (o REST si no hay conexión).
   * @param payload Datos del mensaje.
   */
  sendMessageWs(payload: CreateChatMessageRequest): void {
    const cleanContent = payload.content.trim();
    if (!cleanContent) {
      return;
    }

    const request: CreateChatMessageRequest = {
      conversationId: payload.conversationId,
      content: cleanContent
    };

    if (this.client?.connected) {
      this.client.publish({ destination: '/app/chat.send', body: JSON.stringify(request) });
      return;
    }

    const subscription = this.sendMessageRest(request.conversationId, request.content).subscribe({
      next: (message) => this.emitIncomingMessage(message),
      error: () => undefined
    });
    this.fallbackSubscriptions.push(subscription);
  }

  /**
   * Limpia recursos y desconecta WebSocket al destruir el servicio.
   */
  ngOnDestroy(): void {
    this.disconnectWs();
    this.conversationSubjects.forEach((subject) => subject.complete());
    this.conversationSubjects.clear();
  }

  private ensureConversationSubscription(conversationId: number): void {
    if (!this.client?.connected || this.conversationSubscriptions.has(conversationId)) {
      return;
    }

    const subscription = this.client.subscribe(
      `/topic/chat/conversation/${conversationId}`,
      (message) => this.handleIncomingWsMessage(conversationId, message)
    );
    this.conversationSubscriptions.set(conversationId, subscription);
  }

  private handleIncomingWsMessage(conversationId: number, message: IMessage): void {
    try {
      const parsed = JSON.parse(message.body) as ChatMessageResponse;
      const targetConversationId = parsed.conversationId ?? conversationId;
      this.emitIncomingMessage({ ...parsed, conversationId: targetConversationId });
    } catch {
      return;
    }
  }

  private emitIncomingMessage(message: ChatMessageResponse): void {
    const subject = this.getOrCreateConversationSubject(message.conversationId);
    subject.next(message);
  }

  private getOrCreateConversationSubject(conversationId: number): Subject<ChatMessageResponse> {
    const existing = this.conversationSubjects.get(conversationId);
    if (existing) {
      return existing;
    }
    const created = new Subject<ChatMessageResponse>();
    this.conversationSubjects.set(conversationId, created);
    return created;
  }

  private createClient(token: string, wsUrl: string): void {
    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 0,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      onConnect: () => {
        this.reconnectAttempt = 0;
        this.connectionStateSubject.next('connected');
        this.conversationSubscriptions.forEach((subscription) => subscription.unsubscribe());
        this.conversationSubscriptions.clear();
        this.conversationSubjects.forEach((_, conversationId) => {
          this.ensureConversationSubscription(conversationId);
        });
      },
      onDisconnect: () => {
        if (this.manualDisconnect) {
          this.connectionStateSubject.next('disconnected');
          return;
        }
        this.scheduleReconnect();
      },
      onStompError: () => {
        if (!this.manualDisconnect) {
          this.scheduleReconnect();
        }
      },
      onWebSocketClose: () => {
        if (!this.manualDisconnect) {
          this.scheduleReconnect();
        }
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.manualDisconnect || !this.currentToken) {
      this.connectionStateSubject.next('disconnected');
      return;
    }

    this.connectionStateSubject.next('reconnecting');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempt));
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      if (this.manualDisconnect || !this.currentToken) {
        this.connectionStateSubject.next('disconnected');
        return;
      }

      if (this.client?.active) {
        return;
      }

      this.wsUrlIndex = (this.wsUrlIndex + 1) % this.wsUrls.length;
      this.createClient(this.currentToken, this.wsUrls[this.wsUrlIndex]);
      this.client?.activate();
    }, delay);
  }

  private buildWsUrls(): string[] {
    const base = enviroments.apiUrl.replace(/\/api\/?$/, '');
    const protocol = base.startsWith('https://') ? 'wss://' : 'ws://';
    const host = base.replace(/^https?:\/\//, '');

    const primary = `${protocol}${host}/ws/websocket`;
    const sockJsFallback = `${protocol}${host}/ws`;

    if (primary === sockJsFallback) {
      return [primary];
    }

    return [primary, sockJsFallback];
  }
}