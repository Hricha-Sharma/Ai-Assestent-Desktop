import { apiClient } from './client';
import type { Conversation, Message, ConversationResponse, CreateConversationRequest } from '@/types/conversation';

export const conversationsAPI = {
  async createConversation(data?: CreateConversationRequest): Promise<ConversationResponse> {
    const response = await apiClient.post('/conversations', data || {});
    return response.data;
  },

  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get('/conversations');
    return response.data.conversations || response.data;
  },

  async getConversation(id: string): Promise<ConversationResponse> {
    const response = await apiClient.get(`/conversations/${id}`);
    return response.data;
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await apiClient.get(`/conversations/${conversationId}/messages`);
    return response.data.messages || response.data;
  },

  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/conversations/${id}`);
  },
};

