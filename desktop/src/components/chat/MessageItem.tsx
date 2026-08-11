import type { Message } from '@/types/conversation';

export interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-orange-600 text-white'
            : isAssistant
              ? 'bg-gray-800 text-gray-100 border border-gray-700'
              : 'bg-blue-900/30 text-blue-100'
        }`}
      >
        {message.role === 'assistant' && <p className="text-xs font-medium text-orange-400 mb-1">Assistant</p>}

        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>

        {message.status === 'pending' && (
          <p className="text-xs text-gray-400 mt-2">Sending...</p>
        )}
        {message.status === 'failed' && (
          <p className="text-xs text-red-400 mt-2">Failed to send</p>
        )}

        <p className="text-xs opacity-60 mt-2">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
};

