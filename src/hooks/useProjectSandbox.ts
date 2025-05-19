
import { useState, useEffect } from 'react';
import { type SandpackState } from "@codesandbox/sandpack-react";
import { generateProjectName } from "@/utils/projectNameGenerator";

export const useProjectSandbox = (sandpack: SandpackState | null) => {
  const [currentProject, setCurrentProject] = useState(generateProjectName());

  useEffect(() => {
    if (sandpack && sandpack.updateFile && sandpack.files["/App.tsx"]) {
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
      sandpack.updateFile("/App.tsx", appTsxContent);
    } else if (sandpack && sandpack.addFile && !sandpack.files["/App.tsx"]) {
       const appTsxContent = `
import React from 'react';
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
        sandpack.addFile("/App.tsx", appTsxContent);
    }
  }, [currentProject, sandpack]);

  return {
    currentProject,
    // setCurrentProject // Expose if needed, but for now project name changes are not implemented via UI
  };
};
