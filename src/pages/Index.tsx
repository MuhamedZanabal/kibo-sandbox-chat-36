
import { useState } from "react";
import {
  SandboxProvider,
  SandboxLayout,
  SandboxTabs,
  SandboxTabsList,
  SandboxTabsTrigger,
  SandboxTabsContent,
  SandboxCodeEditor,
  SandboxPreview,
  SandboxConsole,
  SandboxFileExplorer,
} from "@/components/ui/sandbox";
import {
  ExpandableChat,
  ExpandableChatHeader,
  ExpandableChatBody,
  ExpandableChatFooter,
} from "@/components/ui/expandable-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { generateProjectName } from "@/utils/projectNameGenerator";
import { generateExecutionPlan } from "@/services/aiService";
import { executeCommands } from "@/services/executionService";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  text: string;
  type: "user" | "system";
  timestamp: Date;
}

const Index = () => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "How can I help you today?",
      type: "system",
      timestamp: new Date(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    try {
      setIsProcessing(true);
      
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: message,
        type: "user",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setMessage("");

      // Generate project name and execution plan
      const projectName = generateProjectName();
      const plan = await generateExecutionPlan(projectName, message);

      if (!plan) {
        throw new Error("Failed to generate execution plan");
      }

      // Add system message about the plan
      setMessages(prev => [...prev, {
        id: `${Date.now()}-plan`,
        text: `I've generated a plan for project "${projectName}". Would you like to review it?`,
        type: "system",
        timestamp: new Date(),
      }]);

      // Execute the plan
      const result = await executeCommands(plan);

      // Add final status message
      setMessages(prev => [...prev, {
        id: `${Date.now()}-result`,
        text: result.success 
          ? "All operations completed successfully!"
          : "Some operations failed. Check the console for details.",
        type: "system",
        timestamp: new Date(),
      }]);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Execution Error",
          description: "Some operations failed. Please check the console for details.",
        });
      }

    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process your request. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-background to-secondary/20">
      <main className="flex-1 p-4">
        <SandboxProvider
          template="react"
          customSetup={{
            dependencies: {
              "react": "^18.0.0",
              "react-dom": "^18.0.0"
            },
          }}
          files={{
            "/App.js": {
              code: `export default function App() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Welcome to the Sandbox
      </h1>
      <p>Start editing to see your changes!</p>
    </div>
  );
}`,
            },
          }}
        >
          <SandboxLayout>
            <SandboxTabs defaultValue="editor">
              <SandboxTabsList>
                <SandboxTabsTrigger value="editor">Editor</SandboxTabsTrigger>
                <SandboxTabsTrigger value="preview">Preview</SandboxTabsTrigger>
                <SandboxTabsTrigger value="console">Console</SandboxTabsTrigger>
              </SandboxTabsList>
              <SandboxTabsContent value="editor" className="h-[70vh]">
                <div className="grid grid-cols-4 h-full">
                  <div className="col-span-1 border-r">
                    <SandboxFileExplorer />
                  </div>
                  <div className="col-span-3">
                    <SandboxCodeEditor />
                  </div>
                </div>
              </SandboxTabsContent>
              <SandboxTabsContent value="preview" className="h-[70vh]">
                <SandboxPreview />
              </SandboxTabsContent>
              <SandboxTabsContent value="console" className="h-[70vh]">
                <SandboxConsole />
              </SandboxTabsContent>
            </SandboxTabs>
          </SandboxLayout>
        </SandboxProvider>
      </main>

      <ExpandableChat>
        <ExpandableChatHeader>
          <h3 className="text-lg font-semibold">Chat Support</h3>
        </ExpandableChatHeader>
        <ExpandableChatBody className="p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "p-3 rounded-lg max-w-[80%]",
                  msg.type === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-secondary"
                )}
              >
                {msg.text}
              </div>
            ))}
          </div>
        </ExpandableChatBody>
        <ExpandableChatFooter>
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Send"}
            </Button>
          </div>
        </ExpandableChatFooter>
      </ExpandableChat>
    </div>
  );
};

export default Index;
