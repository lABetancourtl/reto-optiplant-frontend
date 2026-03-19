import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Branch, SucursalesService } from '../../services/admin/sucursal.service';
import {
  ChatConversationResponse,
  ChatMessageResponse,
  CreateChatMessageRequest
} from '../../models/chat.models';
import { ChatService, ChatWsConnectionState } from '../../services/chat.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css'
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('messagesList') private messagesListRef?: ElementRef<HTMLDivElement>;

  isOpen = false;
  isLoadingConversations = false;
  isLoadingMessages = false;
  isCreatingConversation = false;
  isSendingMessage = false;

  role = '';
  ownBranchId: number | null = null;
  currentUserName = '';

  connectionState: ChatWsConnectionState = 'disconnected';
  errorMessage = '';

  conversations: ChatConversationResponse[] = [];
  selectedConversation: ChatConversationResponse | null = null;
  messages: ChatMessageResponse[] = [];

  branches: Branch[] = [];
  selectedAdminBranchId: number | null = null;
  selectedDestinationBranchId: number | null = null;
  messageText = '';

  private readonly subscriptions: Subscription[] = [];
  private readonly realtimeConversationSubscriptions = new Map<number, Subscription>();
  private conversationsRefreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private messagesRefreshIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly sucursalesService: SucursalesService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    this.role = this.authService.getNormalizedUserRole();
    this.ownBranchId = this.authService.getUserBranchId();
    this.currentUserName = this.authService.getUserName() || '';

    const token = this.authService.getToken();
    if (token) {
      this.chatService.connectWs(token);
    }

    this.subscriptions.push(
      this.chatService.connectionState$.subscribe((state) => {
        this.connectionState = state;
      })
    );

    this.loadConversations();
    this.loadBranches();

    this.conversationsRefreshIntervalId = setInterval(() => {
      this.loadConversations(this.selectedConversation?.id);
    }, 10000);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.realtimeConversationSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.realtimeConversationSubscriptions.clear();

    if (this.conversationsRefreshIntervalId) {
      clearInterval(this.conversationsRefreshIntervalId);
      this.conversationsRefreshIntervalId = null;
    }

    if (this.messagesRefreshIntervalId) {
      clearInterval(this.messagesRefreshIntervalId);
      this.messagesRefreshIntervalId = null;
    }

    this.chatService.disconnectWs();
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
  }

  loadConversations(selectConversationId?: number): void {
    this.isLoadingConversations = true;
    this.errorMessage = '';

    const subscription = this.chatService.getConversations().subscribe({
      next: (conversations) => {
        this.conversations = [...conversations].sort((a, b) => {
          const left = Date.parse(a.lastMessageAt ?? a.updatedAt ?? a.createdAt);
          const right = Date.parse(b.lastMessageAt ?? b.updatedAt ?? b.createdAt);
          return right - left;
        });

        this.syncConversationRealtimeSubscriptions();

        if (this.conversations.length === 0) {
          this.selectedConversation = null;
          this.messages = [];
          return;
        }

        const nextSelected =
          this.conversations.find((conversation) => conversation.id === selectConversationId) ??
          (this.selectedConversation
            ? this.conversations.find((conversation) => conversation.id === this.selectedConversation?.id)
            : null) ??
          this.conversations[0];

        this.selectConversation(nextSelected);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.mapError(error, 'No fue posible cargar conversaciones.');
      },
      complete: () => {
        this.isLoadingConversations = false;
      }
    });

    this.subscriptions.push(subscription);
  }

  selectConversation(conversation: ChatConversationResponse): void {
    this.selectedConversation = conversation;
    this.errorMessage = '';
    this.loadMessages(conversation.id);

    if (this.messagesRefreshIntervalId) {
      clearInterval(this.messagesRefreshIntervalId);
      this.messagesRefreshIntervalId = null;
    }

    this.messagesRefreshIntervalId = setInterval(() => {
      if (!this.selectedConversation || this.isLoadingMessages) {
        return;
      }
      this.loadMessages(this.selectedConversation.id, true);
    }, 2500);
  }

  sendMessage(): void {
    if (!this.selectedConversation || this.isSendingMessage) {
      return;
    }

    const content = this.messageText.trim();
    if (!content) {
      return;
    }

    this.isSendingMessage = true;
    this.errorMessage = '';
    this.messageText = '';

    const payload: CreateChatMessageRequest = {
      conversationId: this.selectedConversation.id,
      content
    };

    const subscription = this.chatService.sendMessageRest(payload.conversationId, payload.content).subscribe({
      next: (message) => {
        this.appendMessage(message);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.mapError(error, 'No fue posible enviar el mensaje.');
        this.messageText = content;
        this.isSendingMessage = false;
      },
      complete: () => {
        this.isSendingMessage = false;
      }
    });

    this.subscriptions.push(subscription);
  }

  createAdminConversation(): void {
    if (this.role !== 'ADMIN' || !this.selectedAdminBranchId || this.isCreatingConversation) {
      return;
    }

    this.isCreatingConversation = true;
    this.errorMessage = '';

    const subscription = this.chatService.createAdminConversation(this.selectedAdminBranchId).subscribe({
      next: (conversation) => {
        this.loadConversations(conversation.id);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.mapError(error, 'No fue posible crear la conversación con sucursal.');
      },
      complete: () => {
        this.isCreatingConversation = false;
      }
    });

    this.subscriptions.push(subscription);
  }

  createBranchConversation(): void {
    if (
      this.role !== 'SUCURSAL' ||
      !this.ownBranchId ||
      !this.selectedDestinationBranchId ||
      this.selectedDestinationBranchId === this.ownBranchId ||
      this.isCreatingConversation
    ) {
      return;
    }

    this.isCreatingConversation = true;
    this.errorMessage = '';

    const subscription = this.chatService
      .createBranchConversation(this.ownBranchId, this.selectedDestinationBranchId)
      .subscribe({
        next: (conversation) => {
          this.loadConversations(conversation.id);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.mapError(error, 'No fue posible crear la conversación entre sucursales.');
        },
        complete: () => {
          this.isCreatingConversation = false;
        }
      });

    this.subscriptions.push(subscription);
  }

  trackConversation(_: number, conversation: ChatConversationResponse): number {
    return conversation.id;
  }

  trackMessage(_: number, message: ChatMessageResponse): number {
    return message.id;
  }

  getConversationTitle(conversation: ChatConversationResponse): string {
    const sourceName = this.resolveBranchName(conversation.sourceBranchId, conversation.sourceBranchName);
    const destinationName = this.resolveBranchName(
      conversation.destinationBranchId,
      conversation.destinationBranchName
    );

    if (this.role === 'ADMIN') {
      return destinationName ?? sourceName ?? `Conversación #${conversation.id}`;
    }

    const source = conversation.sourceBranchId;
    const destination = conversation.destinationBranchId;

    if (this.ownBranchId && source === this.ownBranchId) {
      return destinationName ?? `Sucursal #${destination ?? '-'}`;
    }
    if (this.ownBranchId && destination === this.ownBranchId) {
      return sourceName ?? `Sucursal #${source ?? '-'}`;
    }
    return destinationName ?? sourceName ?? `Conversación #${conversation.id}`;
  }

  getConnectionLabel(): string {
    if (this.connectionState === 'connected') {
      return 'Conectado';
    }
    if (this.connectionState === 'reconnecting') {
      return 'Reconectando';
    }
    return 'Desconectado';
  }

  /**
   * Determina si un mensaje fue enviado por el usuario actual.
   * - Para ADMIN: los mensajes propios tienen senderBranchId = null
   * - Para SUCURSAL: los mensajes propios tienen senderBranchId = ownBranchId
   */
  isOwnMessage(message: ChatMessageResponse): boolean {
    // Para usuarios ADMIN: si el mensaje NO tiene branchId, fue enviado por el admin
    if (this.role === 'ADMIN') {
      // Mensaje del admin = senderBranchId es null o undefined
      return message.senderBranchId === null || message.senderBranchId === undefined;
    }

    // Para usuarios SUCURSAL: comparar por branchId
    if (this.role === 'SUCURSAL' && this.ownBranchId !== null) {
      return message.senderBranchId === this.ownBranchId;
    }

    // Fallback: comparar por nombre de usuario si esta disponible
    if (message.senderUserName && this.currentUserName) {
      return this.normalizeIdentity(message.senderUserName) === this.normalizeIdentity(this.currentUserName);
    }

    return false;
  }

    private loadMessages(conversationId: number, silent = false): void {
    if (!silent) {
        this.isLoadingMessages = true;
    }

    const subscription = this.chatService.getMessages(conversationId, 0, 50).subscribe({
        next: (messages) => {
        this.reconcileMessages(messages, silent); // Pasar el parámetro silent
        },
        error: (error: HttpErrorResponse) => {
        this.errorMessage = this.mapError(error, 'No fue posible cargar mensajes.');
        },
        complete: () => {
        if (!silent) {
            this.isLoadingMessages = false;
        }
        }
    });
    this.subscriptions.push(subscription);
    }

private reconcileMessages(serverMessages: ChatMessageResponse[], silent = false): void {
  const ordered = [...serverMessages].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  if (this.messages.length === 0) {
    this.messages = ordered;
    this.scheduleScrollToBottom(true); // Forzar en primer cargue
    return;
  }

  const optimistic = this.messages.filter((message) => message.id < 0);
  const merged = [...ordered];

  optimistic.forEach((localMessage) => {
    const matched = ordered.some((remoteMessage) => this.isOptimisticMatch(localMessage, remoteMessage));
    if (!matched) {
      merged.push(localMessage);
    }
  });

  const dedup: ChatMessageResponse[] = [];
  merged
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .forEach((message) => {
      const optimisticIndex = dedup.findIndex(
        (m) =>
          m.id < 0 && message.id > 0 && m.content === message.content && m.createdAt === message.createdAt
      );
      if (optimisticIndex >= 0) {
        dedup[optimisticIndex] = message;
        return;
      }
      if (
        dedup.some(
          (m) =>
            m.id === message.id ||
            (m.id < 0 && message.id < 0 && m.content === message.content && m.createdAt === message.createdAt)
        )
      ) {
        return;
      }
      dedup.push(message);
    });

  const hadNewMessages = dedup.length > this.messages.length;
  this.messages = dedup;

  if (hadNewMessages && !silent) {
    this.scheduleScrollToBottom();
  } else if (hadNewMessages) {
    this.scheduleScrollToBottom(false); // Respeta la posición del usuario
  }
}

  private appendMessage(message: ChatMessageResponse): void {
    if (!this.selectedConversation || message.conversationId !== this.selectedConversation.id) {
      this.updateConversationPreview(message);
      return;
    }

    const exists = this.messages.some(
      (m) =>
        m.id === message.id ||
        (m.id < 0 && message.id < 0 && m.content === message.content && m.createdAt === message.createdAt)
    );
    if (exists) {
      return;
    }

    const optimisticIndex = this.messages.findIndex((existing) => this.isOptimisticMatch(existing, message));

    if (optimisticIndex >= 0 && this.messages[optimisticIndex].id < 0 && message.id > 0) {
      const updated = [...this.messages];
      updated[optimisticIndex] = message;
      this.messages = updated.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    } else {
      this.messages = [...this.messages, message].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    }

    const isOwn = this.isOwnMessage(message);
    this.scheduleScrollToBottom(isOwn);
    this.updateConversationPreview(message);
  }

  private updateConversationPreview(message: ChatMessageResponse): void {
    const exists = this.conversations.some((conversation) => conversation.id === message.conversationId);
    if (!exists) {
      if (!this.isLoadingConversations) {
        this.loadConversations(this.selectedConversation?.id);
      }
      return;
    }

    this.conversations = this.conversations
      .map((conversation) => {
        if (conversation.id !== message.conversationId) {
          return conversation;
        }
        return {
          ...conversation,
          lastMessageContent: message.content,
          lastMessageAt: message.createdAt,
          updatedAt: message.createdAt
        };
      })
      .sort((a, b) => {
        const left = Date.parse(a.lastMessageAt ?? a.updatedAt ?? a.createdAt);
        const right = Date.parse(b.lastMessageAt ?? b.updatedAt ?? b.createdAt);
        return right - left;
      });
  }

  private syncConversationRealtimeSubscriptions(): void {
    const activeIds = new Set(this.conversations.map((conversation) => conversation.id));

    this.conversations.forEach((conversation) => {
      if (this.realtimeConversationSubscriptions.has(conversation.id)) {
        return;
      }

      const subscription = this.chatService
        .subscribeConversation(conversation.id)
        .subscribe((message) => this.appendMessage(message));
      this.realtimeConversationSubscriptions.set(conversation.id, subscription);
    });

    this.realtimeConversationSubscriptions.forEach((subscription, conversationId) => {
      if (activeIds.has(conversationId)) {
        return;
      }

      subscription.unsubscribe();
      this.realtimeConversationSubscriptions.delete(conversationId);
    });
  }

  private loadBranches(): void {
    const subscription = this.sucursalesService.getAll().subscribe({
      next: (branches) => {
        this.branches = branches;
      },
      error: () => {
        this.branches = [];
      }
    });
    this.subscriptions.push(subscription);
  }

  private resolveBranchName(branchId: number | null, existingName: string | null): string | null {
    if (existingName && existingName.trim().length > 0) {
      return existingName;
    }
    if (!branchId) {
      return null;
    }
    const match = this.branches.find((branch) => branch.id === branchId);
    return match?.name ?? null;
  }

  private isOptimisticMatch(existing: ChatMessageResponse, incoming: ChatMessageResponse): boolean {
    if (existing.conversationId !== incoming.conversationId) {
      return false;
    }

    if (existing.senderUserName !== incoming.senderUserName) {
      return false;
    }

    if (existing.content.trim() !== incoming.content.trim()) {
      return false;
    }

    const existingTs = Date.parse(existing.createdAt);
    const incomingTs = Date.parse(incoming.createdAt);
    if (Number.isNaN(existingTs) || Number.isNaN(incomingTs)) {
      return false;
    }

    return Math.abs(existingTs - incomingTs) <= 60000;
  }

    private scheduleScrollToBottom(force = false): void {
    setTimeout(() => this.scrollToBottom(force), 0);
    }

    private scrollToBottom(force = false): void {
    const list = this.messagesListRef?.nativeElement;
    if (!list) {
        return;
    }


    const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    const isNearBottom = distanceFromBottom < 150;

    if (force || isNearBottom) {
        list.scrollTop = list.scrollHeight;
    }
    }

  private normalizeIdentity(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return value.trim().toLowerCase();
  }

  private mapError(error: HttpErrorResponse, fallbackMessage: string): string {
    if (error.status === 401) {
      return 'Sesión expirada. Vuelve a iniciar sesión.';
    }
    if (error.status === 403) {
      return 'No tienes permisos para acceder al chat.';
    }
    return fallbackMessage;
  }
}