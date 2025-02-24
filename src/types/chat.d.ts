
export interface ChatMessage {
  id: string;
  text: string;
  type: "user" | "system";
  timestamp: Date;
}

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
