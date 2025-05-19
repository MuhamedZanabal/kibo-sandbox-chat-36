
import React from 'react';
import { ChatMessage } from '@/types/chat';
import { cn } from '@/lib/utils';
import { type ExecutionResult, type CommandResult } from '@/services/executionService'; // Assuming ExecutionResult is exported

// Helper to check if details is an ExecutionResult
const isExecutionResult = (details: any): details is ExecutionResult => {
  return (
    details &&
    typeof details.success === 'boolean' &&
    Array.isArray(details.commandResults) &&
    Array.isArray(details.logs) &&
    Array.isArray(details.errors)
  );
};

const truncateContent = (content: string | undefined, maxLength = 100): string => {
  if (!content) return "No content";
  if (content.length > maxLength) {
    return content.substring(0, maxLength) + `... (truncated, ${content.length} chars total)`;
  }
  return content;
};

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const renderExecutionResultDetails = (details: ExecutionResult) => {
    return (
      <div className="mt-2 text-xs opacity-90 space-y-2">
        <p><strong>Overall Success:</strong> {details.success ? 'Yes' : 'No'}</p>
        
        {details.commandResults.length > 0 && (
          <div>
            <strong>Commands:</strong>
            <ul className="list-disc list-inside pl-4 space-y-1">
              {details.commandResults.map((cmdResult, index) => (
                <li key={index} className={cn(cmdResult.success ? "" : "text-red-500")}>
                  {cmdResult.command.type.toUpperCase()} {cmdResult.command.path} - {cmdResult.success ? 'Succeeded' : 'Failed'}
                  {cmdResult.command.content && (
                    <div className="pl-4 text-gray-400 text-[10px] break-all">
                      Content: {truncateContent(cmdResult.command.content)}
                    </div>
                  )}
                  {cmdResult.error && <p className="pl-4 text-red-400 text-[10px]">Error: {cmdResult.error}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {details.logs.length > 0 && (
          <div>
            <strong>Logs:</strong>
            <ul className="list-disc list-inside pl-4 max-h-32 overflow-y-auto">
              {details.logs.map((log, index) => (
                <li key={index} className="text-[10px]">{log}</li>
              ))}
            </ul>
          </div>
        )}

        {details.errors.length > 0 && (
          <div>
            <strong>Errors:</strong>
            <ul className="list-disc list-inside pl-4 text-red-500 max-h-32 overflow-y-auto">
              {details.errors.map((error, index) => (
                <li key={index} className="text-[10px]">{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

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
      <div className="whitespace-pre-wrap">{message.text}</div> {/* Ensure message text also wraps */}
      {message.details && (
        <details className="mt-2 text-xs opacity-80">
          <summary className="cursor-pointer">Details</summary>
          {isExecutionResult(message.details) ? (
            renderExecutionResultDetails(message.details)
          ) : (
            <pre className="whitespace-pre-wrap p-2 bg-background/50 rounded max-h-60 overflow-auto">
              {JSON.stringify(message.details, null, 2)}
            </pre>
          )}
        </details>
      )}
    </div>
  );
};

interface ChatMessageItemProps {
  message: ChatMessage;
}

export default ChatMessageItem;
