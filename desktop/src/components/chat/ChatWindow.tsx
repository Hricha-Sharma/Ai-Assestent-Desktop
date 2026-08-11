import { useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Loading } from '@/components/common/Loading';
import { conversationsAPI } from '@/api/conversations';
import { useChatStore } from '@/stores/chatStore';

export interface ChatWindowProps {
  conversationId: string;
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  isLoading?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  onSendMessage,
  isConnected,
  isLoading = false,
}) => {
  const { setMessages, setLoadingMessages } = useChatStore();

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);
      const messages = await conversationsAPI.getMessages(conversationId);
      setMessages(conversationId, messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loading size="lg" message="Loading conversation..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList conversationId={conversationId} />
      <MessageInput
        conversationId={conversationId}
        onSendMessage={onSendMessage}
        isDisabled={!isConnected}
      />
      {!isConnected && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-700 text-red-400 text-sm text-center">
          Reconnecting... Messages will be sent when connection is restored.
        </div>
      )}
    </div>
  );
};

