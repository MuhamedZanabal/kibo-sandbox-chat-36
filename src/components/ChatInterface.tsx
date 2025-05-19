
import React from 'react';
import {
  ExpandableChat,
  ExpandableChatHeader,
  ExpandableChatBody,
  ExpandableChatFooter,
} from "@/components/ui/expandable-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatMessageList from '@/components/ChatMessageList';
import { ChatMessage } from '@/types/chat';
import { type ExecutionPlan } from '@/services/aiService';

interface ChatInterfaceProps {
  currentProject: string;
  chatBodyRef: React.RefObject<HTMLDivElement>;
  messages: ChatMessage[];
  isAwaitingConfirmation: boolean;
  pendingPlan: ExecutionPlan | null;
  handleApprovePlan: () => void;
  handleRejectPlan: () => void;
  message: string;
  setMessage: (value: string) => void;
  handleSendMessage: () => void;
  isProcessing: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  currentProject,
  chatBodyRef,
  messages,
  isAwaitingConfirmation,
  pendingPlan,
  handleApprovePlan,
  handleRejectPlan,
  message,
  setMessage,
  handleSendMessage,
  isProcessing,
}) => {
  return (
    <ExpandableChat>
      <ExpandableChatHeader>
        <h3 className="text-lg font-semibold">AI Engineer Assistant ({currentProject})</h3>
      </ExpandableChatHeader>
      <ExpandableChatBody ref={chatBodyRef} className="p-4">
        <ChatMessageList messages={messages} />
      </ExpandableChatBody>
      <ExpandableChatFooter>
        {isAwaitingConfirmation && pendingPlan ? (
          <div className="flex gap-2 w-full items-center">
            <p className="text-sm flex-grow">Awaiting plan confirmation.</p>
            <Button onClick={handleApprovePlan} size="lg" variant="default" className="bg-green-600 hover:bg-green-700">
              Approve Plan
            </Button>
            <Button onClick={handleRejectPlan} size="lg" variant="destructive">
              Reject Plan
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Describe the changes you want to make..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isAwaitingConfirmation && !isProcessing) {
                  handleSendMessage();
                }
              }}
              className="flex-1"
              disabled={isProcessing || isAwaitingConfirmation}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isProcessing || isAwaitingConfirmation}
              size="lg"
            >
              {isProcessing ? "Processing..." : "Send"}
            </Button>
          </div>
        )}
      </ExpandableChatFooter>
    </ExpandableChat>
  );
};

export default ChatInterface;

