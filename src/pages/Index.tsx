
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

const Index = () => {
  const [message, setMessage] = useState("");

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
            <div className="bg-secondary p-3 rounded-lg max-w-[80%]">
              How can I help you today?
            </div>
          </div>
        </ExpandableChatBody>
        <ExpandableChatFooter>
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
            />
            <Button>Send</Button>
          </div>
        </ExpandableChatFooter>
      </ExpandableChat>
    </div>
  );
};

export default Index;
