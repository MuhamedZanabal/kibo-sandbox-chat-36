import OpenAI from 'openai';
// import { useToast } from "@/components/ui/use-toast"; // useToast is a hook, cannot be used here.
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
const OPENROUTER_API_KEY = "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"; 
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
      model: 'google/gemini-2.5-flash-preview', 
      messages: messages,
      temperature: 0.01,
      max_tokens: 8000, // Increased max_tokens for potentially larger plans
      response_format: { type: "json_object" },
    });

    console.log('OpenRouter API Response:', response);

    const messageContent = response.choices?.[0]?.message?.content;

    if (!messageContent) {
      throw new Error('Invalid API response format from OpenRouter: No message content');
    }

    try {
      const planJson = typeof messageContent === 'string' ? JSON.parse(messageContent) : messageContent;
      
      // Basic validation of the plan structure
      if (!planJson || typeof planJson !== 'object' || !Array.isArray(planJson.commands) || !Array.isArray(planJson.shell_commands) || typeof planJson.post_execution !== 'object') {
        console.error('Invalid execution plan structure from OpenRouter response:', planJson);
        throw new Error('Invalid execution plan structure from OpenRouter response. Ensure the AI returns commands, shell_commands, and post_execution.');
      }

      return planJson as ExecutionPlan;
    } catch (parseError) {
      console.error('Error parsing AI response from OpenRouter:', parseError);
      console.log('Raw AI response content:', messageContent);
      // It might be useful to return a structured error or a partial plan if applicable
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
    // Consider how to inform the user more gracefully, perhaps via a toast from the calling component
    // For now, returning null signifies failure to the caller.
    return null;
  }
};

// The executeCommands function previously here is now removed.
// Its responsibilities are handled by executionService.ts

export const autoOptimize = async (
  projectName: string,
  userPromptContext: string, // Context from the user's last request
  executedPlanContext?: ExecutionPlan // Context from the plan that was just executed
): Promise<ExecutionPlan | null> => {
  console.log('Auto-optimization: Preparing to generate optimization plan for:', projectName);
  let optimizationPrompt = "Analyze the current project files and suggest optimizations for code quality, readability, and performance. Prioritize changes that improve maintainability and adhere to best practices. If recent changes were made, consider them in your analysis.";
  
  if (userPromptContext) {
    optimizationPrompt += `\n\nThe last user development request was: "${userPromptContext}"`;
  }
  if (executedPlanContext && executedPlanContext.commands.length > 0) {
    const relevantPaths = Array.from(new Set(executedPlanContext.commands.map(c => c.path))).join(', ');
    optimizationPrompt += `\n\nThe following files were recently modified: ${relevantPaths}. Focus optimizations on these files or related logic if appropriate, or perform general project optimization. Ensure any new code follows the established project guidelines.`;
  } else {
    optimizationPrompt += "\nPerform a general project optimization."
  }
  optimizationPrompt += "\n\nReturn a standard ExecutionPlan JSON object."

  console.log('Auto-optimization prompt:', optimizationPrompt);

  const plan = await generateExecutionPlan(projectName, optimizationPrompt);
  
  if (plan) {
    console.log('Auto-optimization plan generated successfully:', plan);
    return plan;
  }
  
  console.log('Auto-optimization: Failed to generate an optimization plan.');
  return null;
};
