
import { useSandpack, SandpackProvider } from "@codesandbox/sandpack-react";
import { generateProjectName } from "@/utils/projectNameGenerator";
import { type SandpackFileOperations } from "@/services/executionService";

import SandboxView from "@/components/SandboxView";
import ChatInterface from "@/components/ChatInterface";
import { useChatManager } from "@/hooks/useChatManager";
import { useProjectSandbox } from "@/hooks/useProjectSandbox";
import { useEffect, useMemo } from "react";


const IndexPageContent = () => {
  const { sandpack } = useSandpack();

  const sandpackOps: SandpackFileOperations | null = useMemo(() => {
    if (sandpack) {
      return {
        updateFile: sandpack.updateFile,
        deleteFile: sandpack.deleteFile,
        addFile: sandpack.addFile,
      };
    }
    return null;
  }, [sandpack]);

  const { currentProject } = useProjectSandbox(sandpack);
  const {
    message,
    setMessage,
    messages,
    isProcessing,
    pendingPlan,
    isAwaitingConfirmation,
    chatBodyRef,
    handleSendMessage,
    handleApprovePlan,
    handleRejectPlan,
  } = useChatManager({ currentProject, sandpackOps });


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
