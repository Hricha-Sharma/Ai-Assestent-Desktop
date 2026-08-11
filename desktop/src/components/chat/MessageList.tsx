import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { MessageItem } from './MessageItem';
import { Loading } from '@/components/common/Loading';
import type { Message } from '@/types/conversation';

export interface MessageListProps {
  conversationId: string;
}

export const MessageList: React.FC<MessageListProps> = ({ conversationId }) => {
  const { messages, isLoadingMessages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationMessages: Message[] = messages[conversationId] || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {isLoadingMessages && (
        <div className="flex justify-center py-8">
          <Loading size="md" message="Loading messages..." />
        </div>
      )}

      {conversationMessages.length === 0 && !isLoadingMessages && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-400">No messages yet</p>
            <p className="text-gray-500 text-sm mt-2">Start a conversation by sending a message</p>
          </div>
        </div>
      )}

      {conversationMessages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
};

