import OpenAI from 'openai';
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

// IMPORTANT: Replace with your actual OpenRouter API key
const OPENROUTER_API_KEY = "YOUR_OPENROUTER_API_KEY_HERE"; 
const OPENROUTER_API_BASE_URL = "https://openrouter.ai/api/v1";

// Initialize OpenAI client for OpenRouter
const openai = new OpenAI({
  baseURL: OPENROUTER_API_BASE_URL,
  apiKey: OPENROUTER_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

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
    console.log('Generating execution plan for:', projectName, 'using OpenRouter');
    console.log('User prompt:', userPrompt);

    if (OPENROUTER_API_KEY === "YOUR_OPENROUTER_API_KEY_HERE") {
      console.error("OpenRouter API key is not set. Please update it in src/services/aiService.ts");
      // Potentially use toast here, but useToast is a hook and cannot be used in a non-component function.
      // For now, we'll rely on the console error and return null.
      // A more robust solution would involve global state or a dedicated error reporting mechanism.
      alert("OpenRouter API key is not configured. Please check the console and update the code.");
      return null;
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: createSystemPrompt(projectName)
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'qwen/qwen-2.5-coder-32b-instruct', // Using the same model, ensure it's available on OpenRouter
      messages: messages,
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }, // Request JSON output if model supports it
    });

    console.log('OpenRouter API Response:', response);

    const messageContent = response.choices?.[0]?.message?.content;

    if (!messageContent) {
      throw new Error('Invalid API response format from OpenRouter');
    }

    try {
      // The OpenAI SDK should ideally parse JSON if response_format is json_object and model supports it.
      // If it's a string, we parse.
      const planJson = typeof messageContent === 'string' ? JSON.parse(messageContent) : messageContent;
      
      if (!planJson.commands || !planJson.shell_commands || !planJson.post_execution) {
        throw new Error('Invalid execution plan structure from OpenRouter response');
      }

      return planJson as ExecutionPlan;
    } catch (parseError) {
      console.error('Error parsing AI response from OpenRouter:', parseError);
      console.log('Raw AI response content:', messageContent);
      return null;
    }

  } catch (error) {
    console.error('Error generating execution plan via OpenRouter:', error);
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error Details:', {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type,
      });
    }
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
