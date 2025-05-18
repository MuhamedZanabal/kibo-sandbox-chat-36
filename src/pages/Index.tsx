
import { useState, useEffect } from "react";
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
import { useSandpack } from "@codesandbox/sandpack-react"; // Changed import source
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
import { generateExecutionPlan, autoOptimize, type ExecutionPlan } from "@/services/aiService";
import { executeFileCommands, type SandpackFileOperations, type ExecutionResult } from "@/services/executionService";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  text: string;
  type: "user" | "system";
  timestamp: Date;
  details?: any;
}

const IndexPageContent = () => {
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
  
  const { sandpack } = useSandpack();

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

      const sandpackOps: SandpackFileOperations = {
        updateFile: sandpack.updateFile,
        deleteFile: sandpack.deleteFile,
        addFile: sandpack.addFile,
      };

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
            variant: optResult.success ? "default" : "default", // Changed "warning" to "default"
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
        details: executionResult
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
      <main className="flex-1 p-4 overflow-hidden">
        <SandboxLayout>
          <SandboxTabs defaultValue="editor">
            <SandboxTabsList>
              <SandboxTabsTrigger value="editor">Editor</SandboxTabsTrigger>
              <SandboxTabsTrigger value="preview">Preview</SandboxTabsTrigger>
              <SandboxTabsTrigger value="console">Console</SandboxTabsTrigger>
            </SandboxTabsList>
            <SandboxTabsContent value="editor" className="h-[calc(100vh-200px)] md:h-[calc(100vh-250px)]">
              <div className="grid grid-cols-4 h-full">
                <div className="col-span-1 border-r">
                  <SandboxFileExplorer />
                </div>
                <div className="col-span-3">
                  <SandboxCodeEditor />
                </div>
              </div>
            </SandboxTabsContent>
            <SandboxTabsContent value="preview" className="h-[calc(100vh-200px)] md:h-[calc(100vh-250px)]">
              <SandboxPreview />
            </SandboxTabsContent>
            <SandboxTabsContent value="console" className="h-[calc(100vh-200px)] md:h-[calc(100vh-250px)]">
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
                  "p-3 rounded-lg max-w-[80%] break-words",
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

const Index = () => {
  const initialProjectName = generateProjectName(); 

  return (
    <SandboxProvider
      template="react-ts" // Changed template to react-ts for better TS support
      customSetup={{
        dependencies: {
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "lucide-react": "latest",
          // Consider adding tailwindcss and other common deps if sandpack doesn't include them by default with react-ts
        },
        entry: "/index.tsx", // Adjusted entry for TypeScript
        // Removed 'main' property as it's not a standard SandpackSetup property
      }}
      files={{
        "/App.tsx": { // Changed to App.tsx
          code: `import React from 'react';
export default function App() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Project: ${initialProjectName}
      </h1>
      <p>Welcome to your project! Start by asking the AI to make changes.</p>
      <p className="mt-4 text-sm text-muted-foreground">
        For example: "Create a new component called MyButton with green background and text 'Click Me'. Then use it in App.tsx."
      </p>
    </div>
  );
}`,
        },
        "/index.tsx": { // Changed to index.tsx
          code: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// import './styles.css'; // If you add a styles.css, ensure it's in files too

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        },
        // Ensure tsconfig.json is implicitly handled by "react-ts" template or add a basic one if needed
        // "/tsconfig.json": {
        //   code: JSON.stringify({
        //     compilerOptions: {
        //       target: "esnext",
        //       lib: ["dom", "dom.iterable", "esnext"],
        //       allowJs: true,
        //       skipLibCheck: true,
        //       esModuleInterop: true,
        //       allowSyntheticDefaultImports: true,
        //       strict: true,
        //       forceConsistentCasingInFileNames: true,
        //       noFallthroughCasesInSwitch: true,
        //       module: "esnext",
        //       moduleResolution: "node",
        //       resolveJsonModule: true,
        //       isolatedModules: true,
        //       noEmit: true,
        //       jsx: "react-jsx"
        //     },
        //     include: ["src", "**/*.ts", "**/*.tsx"], // Adjust include paths based on Sandpack structure
        //     exclude: ["node_modules"]
        //   }, null, 2)
        // }
      }}
      options={{
        activeFile: "/App.tsx", // Changed to App.tsx
        visibleFiles: ["/App.tsx", "/index.tsx"], // Changed to .tsx
        // Removed 'editorHeight' as it's not a standard SandpackProvider option
        // theme: "dark", 
      }}
    >
      <IndexPageContent />
    </SandboxProvider>
  );
};

export default Index;
