import { useState, useEffect, useRef } from "react";
import {
  SandboxProvider,
} from "@/components/ui/sandbox";
import { useSandpack } from "@codesandbox/sandpack-react";
import { useToast } from "@/components/ui/use-toast";
import { generateProjectName } from "@/utils/projectNameGenerator";
import { generateExecutionPlan, autoOptimize, type ExecutionPlan } from "@/services/aiService";
import { executeFileCommands, type SandpackFileOperations, type ExecutionResult } from "@/services/executionService";
import { ChatMessage } from '@/types/chat';

import SandboxView from "@/components/SandboxView";
import ChatInterface from "@/components/ChatInterface";

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
  
  const [pendingPlan, setPendingPlan] = useState<ExecutionPlan | null>(null);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);

  const { sandpack } = useSandpack();
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const executePlanAndOptimize = async (planToExecute: ExecutionPlan) => {
    const sandpackOps: SandpackFileOperations = {
      updateFile: sandpack.updateFile,
      deleteFile: sandpack.deleteFile,
      addFile: sandpack.addFile,
    };

    const executionResult = await executeFileCommands(planToExecute, sandpackOps);
    
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

      const optimizationPlan = await autoOptimize(currentProject, messages.find(m => m.type === 'user')?.text || "User request context missing", planToExecute);
      if (optimizationPlan && optimizationPlan.commands.length > 0) {
        setMessages(prev => [...prev, {
          id: `${Date.now()}-opt-plan`,
          text: `Auto-optimization plan generated (Commands: ${optimizationPlan.commands.length}). Executing...`,
          type: "system",
          timestamp: new Date(),
          details: optimizationPlan, // Show opt plan details too
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
          variant: optResult.success ? "default" : "default", // Keep "default" for non-destructive
        });
         setMessages(prev => [...prev, { // Add message for optimization result
          id: `${Date.now()}-opt-result`,
          text: `Optimization Result: ${finalSystemMessageText.substring(finalSystemMessageText.indexOf("Auto-optimization"))}`,
          type: "system",
          timestamp: new Date(),
          details: optResult 
        }]);
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
      text: finalSystemMessageText.startsWith("Main changes applied successfully!") ? finalSystemMessageText : "Execution attempt finished.", // More generic if initial failed
      type: "system",
      timestamp: new Date(),
      details: executionResult
    }]);
  };

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

      setPendingPlan(plan);
      setIsAwaitingConfirmation(true);
      setMessages(prev => [...prev, {
        id: `${Date.now()}-plan-review`,
        text: `Execution plan generated with ${plan.commands.length} file operations and ${plan.shell_commands.length} shell commands. Please review the details and approve or reject.`,
        type: "system", // Corrected: Use "system" type
        timestamp: new Date(),
        details: plan 
      }]);
      // isProcessing remains true to disable input

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
      setIsProcessing(false);
      setIsAwaitingConfirmation(false);
      setPendingPlan(null);
    } 
  };

  const handleApprovePlan = async () => {
    if (!pendingPlan) return;

    setIsAwaitingConfirmation(false);
    
    setMessages(prev => [...prev, {
      id: `${Date.now()}-plan-approved`,
      text: "Plan approved. Proceeding with execution...",
      type: "system",
      timestamp: new Date(),
    }]);

    try {
      await executePlanAndOptimize(pendingPlan);
    } catch (error) {
      console.error('Error during approved plan execution:', error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred during execution.";
      toast({
        variant: "destructive",
        title: "Execution CriticalError",
        description: `Failed to execute approved plan: ${errorText}`,
      });
       setMessages(prev => [...prev, {
        id: `${Date.now()}-execution-critical-error`,
        text: `A critical error occurred during plan execution: ${errorText}. Please check console.`,
        type: "system",
        timestamp: new Date(),
      }]);
    } finally {
      setPendingPlan(null);
      setIsProcessing(false); 
    }
  };

  const handleRejectPlan = () => {
    setIsAwaitingConfirmation(false);
    setPendingPlan(null);
    setMessages(prev => [...prev, {
      id: `${Date.now()}-plan-rejected`,
      text: "Plan rejected. No changes were made.",
      type: "system",
      timestamp: new Date(),
    }]);
    setIsProcessing(false);
  };
  
  useEffect(() => {
    const appTsxContent = `
import React from 'react';
// Ensure styles.css is created or remove this import if not used
// import './styles.css'; 

export default function App() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Project: ${currentProject}
      </h1>
      <p>Welcome to your project! Start by asking the AI to make changes.</p>
      <p className="mt-4 text-sm text-muted-foreground">
        For example: "Create a new component called MyButton with green background and text 'Click Me'. Then use it in App.tsx."
      </p>
    </div>
  );
}`;
    // Check if App.tsx exists before updating, or ensure it's the active/intended entry.
    // The initial setup creates App.tsx. This will update it.
    if (sandpack.files["/App.tsx"]) {
        sandpack.updateFile("/App.tsx", appTsxContent);
    } else {
        // If App.tsx doesn't exist for some reason, create it.
        // This branch might be unlikely given SandpackProvider setup.
        sandpack.addFile("/App.tsx", appTsxContent);
    }

  }, [currentProject, sandpack]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-background to-secondary/20">
      <main className="flex-1 p-4 overflow-hidden">
        <SandboxView />
      </main>
      <ChatInterface
        currentProject={currentProject}
        chatBodyRef={chatBodyRef}
        messages={messages}
        isAwaitingConfirmation={isAwaitingConfirmation}
        pendingPlan={pendingPlan}
        handleApprovePlan={handleApprovePlan}
        handleRejectPlan={handleRejectPlan}
        message={message}
        setMessage={setMessage}
        handleSendMessage={handleSendMessage}
        isProcessing={isProcessing}
      />
    </div>
  );
};

const Index = () => {
  const initialProjectName = generateProjectName(); 

  return (
    <SandboxProvider
      template="react-ts" 
      customSetup={{
        dependencies: {
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "lucide-react": "latest",
        },
        entry: "/index.tsx", 
      }}
      files={{
        "/App.tsx": { 
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
        "/index.tsx": { 
          code: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// import './styles.css'; // Ensure this file exists if uncommented

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        },
        // It's good practice to have a styles.css, even if empty initially, if it's imported.
        // "/styles.css": { code: `/* Add your global styles here */` } 
      }}
      options={{
        activeFile: "/App.tsx", 
        visibleFiles: ["/App.tsx", "/index.tsx"], 
      }}
    >
      <IndexPageContent />
    </SandboxProvider>
  );
};

export default Index;
