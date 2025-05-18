
import { useState, useEffect } from "react"; // Added useEffect for potential future use
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
  useSandpack, // Import useSandpack
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
import { generateExecutionPlan, autoOptimize, type ExecutionPlan } from "@/services/aiService"; // ExecutionPlan type
import { executeFileCommands, type SandpackFileOperations, type ExecutionResult } from "@/services/executionService"; // executeFileCommands and types
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  text: string;
  type: "user" | "system";
  timestamp: Date;
  details?: any; // For storing execution plan details or errors
}

const IndexPageContent = () => { // Renamed Index to IndexPageContent to use useSandpack
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "I'm your AI software engineer assistant. How can I help you today?",
      type: "system",
      timestamp: new Date(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProject, setCurrentProject] = useState(generateProjectName());
  
  const { sandpack } = useSandpack(); // Get sandpack client instance

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    const userMessageText = message;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: userMessageText,
      type: "user",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setMessage("");

    try {
      // Generate execution plan
      setMessages(prev => [...prev, { id: `${Date.now()}-planning`, text: "Generating execution plan...", type: "system", timestamp: new Date() }]);
      const plan = await generateExecutionPlan(currentProject, userMessageText);

      if (!plan) {
        setMessages(prev => [...prev, {
          id: `${Date.now()}-error-plan`,
          text: "Failed to generate an execution plan. The AI might be unavailable or the request too complex. Please check console logs and try rephrasing.",
          type: "system",
          timestamp: new Date(),
        }]);
        toast({
          variant: "destructive",
          title: "Planning Error",
          description: "Could not generate an execution plan. Check console.",
        });
        setIsProcessing(false);
        return;
      }

      setMessages(prev => [...prev, {
        id: `${Date.now()}-plan-generated`,
        text: `Execution plan generated. Commands: ${plan.commands.length}, Shell: ${plan.shell_commands.length}. Proceeding with execution...`,
        type: "system",
        timestamp: new Date(),
        details: { commands: plan.commands.map(c => `${c.type} ${c.path}`) }
      }]);

      // Prepare Sandpack operations
      const sandpackOps: SandpackFileOperations = {
        updateFile: sandpack.updateFile,
        deleteFile: sandpack.deleteFile,
        addFile: sandpack.addFile,
      };

      // Execute the plan
      const executionResult = await executeFileCommands(plan, sandpackOps);
      
      executionResult.logs.forEach(log => console.log("Execution Log:", log));
      executionResult.errors.forEach(err => console.error("Execution Error Detail:", err));
      
      let finalSystemMessageText = "";

      if (executionResult.success) {
        finalSystemMessageText = "Main changes applied successfully! ";
        toast({ title: "Execution Successful", description: "Main changes applied." });

        setMessages(prev => [...prev, {
          id: `${Date.now()}-optimizing`,
          text: "Attempting auto-optimization...",
          type: "system",
          timestamp: new Date(),
        }]);

        const optimizationPlan = await autoOptimize(currentProject, userMessageText, plan);
        if (optimizationPlan && optimizationPlan.commands.length > 0) {
          setMessages(prev => [...prev, {
            id: `${Date.now()}-opt-plan`,
            text: `Auto-optimization plan generated (Commands: ${optimizationPlan.commands.length}). Executing...`,
            type: "system",
            timestamp: new Date(),
          }]);
          const optResult = await executeFileCommands(optimizationPlan, sandpackOps);
          optResult.logs.forEach(log => console.log("Optimization Log:", log));
          optResult.errors.forEach(err => console.error("Optimization Error Detail:", err));
          
          finalSystemMessageText += optResult.success 
            ? "Auto-optimization completed successfully." 
            : "Auto-optimization encountered issues (check console).";
          toast({
            title: optResult.success ? "Optimization Successful" : "Optimization Issue",
            description: optResult.success ? "Code optimized." : "Optimization had issues. Check console.",
            variant: optResult.success ? "default" : "warning",
          });
        } else if (optimizationPlan && optimizationPlan.commands.length === 0) {
            finalSystemMessageText += "Auto-optimization analysis found no immediate actions to take.";
             toast({ title: "Optimization", description: "No optimization actions needed at this time." });
        } else {
          finalSystemMessageText += "Auto-optimization step was skipped or failed to generate a plan.";
          toast({ title: "Optimization Skipped", description: "Could not generate optimization plan.", variant: "default" });
        }
      } else {
        finalSystemMessageText = "Some operations couldn't be completed. Please review the details and check the console.";
        toast({
          variant: "destructive",
          title: "Execution Failed",
          description: `Operations failed. ${executionResult.errors.join('; ')}. Check console.`,
          duration: 7000,
        });
      }
      
      setMessages(prev => [...prev, {
        id: `${Date.now()}-result`,
        text: finalSystemMessageText,
        type: "system",
        timestamp: new Date(),
        details: executionResult // Store full result for potential display/debugging
      }]);

    } catch (error) {
      console.error('Error processing message in handleSendMessage:', error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Critical Error",
        description: `Failed to process your request: ${errorText}`,
      });
      setMessages(prev => [...prev, {
        id: `${Date.now()}-critical-error`,
        text: `A critical error occurred: ${errorText}. Please check console and try again.`,
        type: "system",
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Update App.js content when currentProject changes
  useEffect(() => {
    sandpack.updateFile("/App.js", `export default function App() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Project: ${currentProject}
      </h1>
      <p>Start editing to see your changes!</p>
    </div>
  );
}`);
  }, [currentProject, sandpack]);


  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-background to-secondary/20">
      <main className="flex-1 p-4 overflow-hidden"> {/* Added overflow-hidden to main */}
        {/* SandboxLayout will be rendered by SandboxProvider which is now wrapping IndexPageContent */}
        {/* The SandboxProvider related JSX is moved to a new wrapper component */}
        <SandboxLayout>
          <SandboxTabs defaultValue="editor">
            <SandboxTabsList>
              <SandboxTabsTrigger value="editor">Editor</SandboxTabsTrigger>
              <SandboxTabsTrigger value="preview">Preview</SandboxTabsTrigger>
              <SandboxTabsTrigger value="console">Console</SandboxTabsTrigger>
            </SandboxTabsList>
            <SandboxTabsContent value="editor" className="h-[calc(100vh-200px)] md:h-[calc(100vh-250px)]"> {/* Adjusted height */}
              <div className="grid grid-cols-4 h-full">
                <div className="col-span-1 border-r">
                  <SandboxFileExplorer />
                </div>
                <div className="col-span-3">
                  <SandboxCodeEditor />
                </div>
              </div>
            </SandboxTabsContent>
            <SandboxTabsContent value="preview" className="h-[calc(100vh-200px)] md:h-[calc(100vh-250px)]"> {/* Adjusted height */}
              <SandboxPreview />
            </SandboxTabsContent>
            <SandboxTabsContent value="console" className="h-[calc(100vh-200px)] md:h-[calc(100vh-250px)]"> {/* Adjusted height */}
              <SandboxConsole />
            </SandboxTabsContent>
          </SandboxTabs>
        </SandboxLayout>
      </main>

      <ExpandableChat>
        <ExpandableChatHeader>
          <h3 className="text-lg font-semibold">AI Engineer Assistant ({currentProject})</h3>
        </ExpandableChatHeader>
        <ExpandableChatBody className="p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "p-3 rounded-lg max-w-[80%] break-words", // Added break-words
                  msg.type === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-secondary"
                )}
              >
                <p className="font-semibold text-xs mb-1 opacity-70">
                  {msg.type === "user" ? "You" : "AI Assistant"} - {msg.timestamp.toLocaleTimeString()}
                </p>
                {msg.text}
                {msg.details && (
                  <details className="mt-2 text-xs opacity-80">
                    <summary>Details</summary>
                    <pre className="whitespace-pre-wrap p-2 bg-background/50 rounded">
                      {JSON.stringify(msg.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </ExpandableChatBody>
        <ExpandableChatFooter>
          <div className="flex gap-2">
            <Input
              placeholder="Describe the changes you want to make..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={isProcessing}
              size="lg"
            >
              {isProcessing ? "Processing..." : "Send"}
            </Button>
          </div>
        </ExpandableChatFooter>
      </ExpandableChat>
    </div>
  );
};

// New wrapper component to provide Sandpack context
const Index = () => {
  // Default files for Sandpack, currentProject needs to be initialized or passed if dynamic project name is needed here
  // For simplicity, using a static name or default generated one for initial setup.
  // If currentProject in IndexPageContent needs to affect this, state needs to be lifted or context used.
  // For now, this initial App.js uses a static project name.
  // The useEffect in IndexPageContent will update it once that component mounts and currentProject state is set.
  const initialProjectName = generateProjectName(); 

  return (
    <SandboxProvider
      template="react"
      customSetup={{
        dependencies: {
          "react": "^18.2.0", // Ensure versions are robust
          "react-dom": "^18.2.0",
          "lucide-react": "latest", // Example: ensure common UI deps are available
        },
        entry: "/index.js", // Default entry
        main: "/App.js", // Main component
      }}
      files={{
        "/App.js": {
          code: `import React from 'react';
export default function App() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Project: ${initialProjectName} {/* Use initial name here */}
      </h1>
      <p>Welcome to your project! Start by asking the AI to make changes.</p>
      <p className="mt-4 text-sm text-muted-foreground">
        For example: "Create a new component called MyButton with green background and text 'Click Me'. Then use it in App.js."
      </p>
    </div>
  );
}`,
        },
        "/index.js": { // Default entry point for React projects in Sandpack
          code: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// You might want to import a global CSS file here if needed
// import './styles.css'; 

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        },
        // "/styles.css": { // Example for global styles
        //   code: `body { font-family: sans-serif; margin: 20px; padding: 0; }`
        // }
      }}
      options={{
        activeFile: "/App.js",
        visibleFiles: ["/App.js", "/index.js"],
        editorHeight: "70vh", // Default height, can be overridden by SandboxTabsContent
        // theme: "dark", // Optional: set a theme
      }}
    >
      <IndexPageContent />
    </SandboxProvider>
  );
};

export default Index;

