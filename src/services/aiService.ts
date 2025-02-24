
import { useToast } from "@/components/ui/use-toast";

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
You are a development assistant. You need to help create or modify a React project named "${projectName}".
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
        temperature: 0.7,
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

    // Parse the response content as JSON
    try {
      const planJson = JSON.parse(data.choices[0].message.content);
      
      // Validate the response structure
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
