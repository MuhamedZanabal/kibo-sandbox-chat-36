
import React from 'react';
import { ChatMessage } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatMessageItemProps {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  return (
    <div
      className={cn(
        "p-3 rounded-lg max-w-[80%] break-words",
        message.type === "user"
          ? "bg-primary text-primary-foreground ml-auto"
          : "bg-secondary"
      )}
    >
      <p className="font-semibold text-xs mb-1 opacity-70">
        {message.type === "user" ? "You" : "AI Assistant"} - {message.timestamp.toLocaleTimeString()}
      </p>
      {message.text}
      {message.details && (
        <details className="mt-2 text-xs opacity-80">
          <summary>Details</summary>
          <pre className="whitespace-pre-wrap p-2 bg-background/50 rounded">
            {JSON.stringify(message.details, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ChatMessageItem;
