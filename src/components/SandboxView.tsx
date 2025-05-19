
import React from 'react';
import {
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

const SandboxView = () => {
  return (
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
  );
};

export default SandboxView;

