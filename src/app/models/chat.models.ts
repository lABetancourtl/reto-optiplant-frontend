export interface ChatConversationResponse {
  id: number;
  type: string;
  sourceBranchId: number | null;
  sourceBranchName: string | null;
  destinationBranchId: number | null;
  destinationBranchName: string | null;
  adminUserName: string | null;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageResponse {
  id: number;
  conversationId: number;
  senderUserName: string;
  senderRole: string;
  senderBranchId: number | null;
  content: string;
  createdAt: string;
}

export interface CreateChatMessageRequest {
  conversationId: number;
  content: string;
}