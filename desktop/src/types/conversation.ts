export type Message = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
};

export type CreateConversationRequest = {
  title?: string;
};

export type ConversationResponse = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type MessagesResponse = {
  messages: Message[];
};

