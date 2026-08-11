import { useState, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';

export interface MessageInputProps {
  conversationId: string;
  onSendMessage: (content: string) => void;
  isDisabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  onSendMessage,
  isDisabled = false,
}) => {
  const [localContent, setLocalContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setMessageDraft, getMessageDraft } = useChatStore();

  // Load draft on mount
  if (!localContent && getMessageDraft(conversationId)) {
    setLocalContent(getMessageDraft(conversationId));
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setLocalContent(content);
    setMessageDraft(conversationId, content);

    // Auto-expand textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!localContent.trim()) {
      return;
    }

    onSendMessage(localContent.trim());
    setLocalContent('');
    setMessageDraft(conversationId, '');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-700 p-4 bg-gray-900">
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder="Type your message... (Shift+Enter for new line)"
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 disabled:opacity-50 resize-none"
          rows={1}
          style={{ maxHeight: '120px' }}
        />
        <button
          type="submit"
          disabled={!localContent.trim() || isDisabled}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors duration-200"
        >
          Send
        </button>
      </div>
    </form>
  );
};

