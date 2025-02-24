
import { useToast } from "@/components/ui/use-toast";
import { generateProjectName } from "@/utils/projectNameGenerator";

const FULL_STACK_GUIDELINES = `
// Engineering manifest and guidelines similar to Python version
<engineering_manifest>
1. Core Architecture
- React with TypeScript
- Atomic design principles
- Performance optimized builds
- Security hardened components

2. Frontend Standards
- Shadcn/ui components
- ARIA compliant
- Responsive design
- Error boundaries

3. Code Quality
- TypeScript strict mode
- ESLint configuration
- Unit test coverage
- Performance monitoring
</engineering_manifest>
`;

export interface ExecutionPlan {
  commands: Array<{
    type: 'create' | 'modify' | 'delete' | 'refactor';
    path: string;
    content?: string;
  }>;
  shell_commands: Array<{
    command: string;
    retries?: number;
  }>;
  post_execution: {
    optimizations: Array<{
      type: string;
      description: string;
      suggestion: string;
    }>;
  };
}

const DEEPINFRA_API_URL = 'https://api.deepinfra.com/v1/openai/chat/completions';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const createSystemPrompt = (projectName: string) => `
You are a development assistant for a React project named "${projectName}".
Follow these guidelines:
${FULL_STACK_GUIDELINES}

Your responses should always be in JSON format with the following structure:
{
  "commands": [
    { "type": "create|modify|delete|refactor", "path": "file_path", "content": "file_content" }
  ],
  "shell_commands": [
    { "command": "shell_command", "retries": number }
  ],
  "post_execution": {
    "optimizations": [
      { "type": "type", "description": "description", "suggestion": "suggestion" }
    ]
  }
}
`;

export const generateExecutionPlan = async (
  projectName: string,
  userPrompt: string
): Promise<ExecutionPlan | null> => {
  try {
    console.log('Generating execution plan for:', projectName);
    console.log('User prompt:', userPrompt);

    const messages: Message[] = [
      {
        role: 'system',
        content: createSystemPrompt(projectName)
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];

    const response = await fetch(DEEPINFRA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
        messages: messages,
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response:', data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response format');
    }

    try {
      const planJson = JSON.parse(data.choices[0].message.content);
      
      if (!planJson.commands || !planJson.shell_commands || !planJson.post_execution) {
        throw new Error('Invalid execution plan structure');
      }

      return planJson as ExecutionPlan;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw AI response:', data.choices[0].message.content);
      return null;
    }

  } catch (error) {
    console.error('Error generating execution plan:', error);
    return null;
  }
};

export const executeCommands = async (plan: ExecutionPlan): Promise<boolean> => {
  try {
    // Execute file operations
    for (const command of plan.commands) {
      console.log(`Executing ${command.type} operation on ${command.path}`);
      // File operations will be handled by the frontend
    }

    // Execute shell commands if needed
    for (const cmd of plan.shell_commands) {
      console.log(`Would execute shell command: ${cmd.command}`);
      // Shell commands will be logged but not executed in the frontend
    }

    return true;
  } catch (error) {
    console.error('Error executing commands:', error);
    return false;
  }
};

export const autoOptimize = async (projectName: string): Promise<void> => {
  console.log('Running auto-optimization for:', projectName);
  const plan = await generateExecutionPlan(projectName, "Analyze and optimize all existing project files.");
  if (plan) {
    await executeCommands(plan);
  }
};
