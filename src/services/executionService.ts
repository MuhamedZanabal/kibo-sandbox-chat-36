import { type ExecutionPlan } from './aiService';

// Interface for the Sandpack file operations we need
export interface SandpackFileOperations {
  updateFile: (path: string, code: string, active?: boolean) => void;
  deleteFile: (path: string) => void;
  addFile: (path: string, code: string, active?: boolean) => void;
  // Potentially: renameFile: (oldPath: string, newPath: string) => void;
}

// Interface for the result of a single command execution
export interface CommandResult { // Ensure this is exported
  command: ExecutionPlan['commands'][0];
  success: boolean;
  error?: string;
}

// Interface for the overall execution result
export interface ExecutionResult { // Ensure this is exported
  success: boolean; // Overall success of all commands
  commandResults: CommandResult[];
  logs: string[]; // General logs from the execution process
  errors: string[]; // General errors not tied to specific commands
}

export const executeFileCommands = async (
  plan: ExecutionPlan,
  sandpackOps: SandpackFileOperations
): Promise<ExecutionResult> => {
  const logs: string[] = [];
  const errors: string[] = [];
  const commandResults: CommandResult[] = [];
  let overallSuccess = true;

  logs.push('Starting execution of file commands...');

  for (const command of plan.commands) {
    logs.push(`Processing command: ${command.type} ${command.path}`);
    try {
      switch (command.type) {
        case 'create':
          if (command.content === undefined) {
            throw new Error(`Content is missing for create operation on ${command.path}`);
          }
          // Sandpack's addFile can take an optional third argument to make the file active
          // For simplicity, we're not setting it active here, but it could be a feature.
          await sandpackOps.addFile(command.path, command.content);
          logs.push(`File created: ${command.path}`);
          commandResults.push({ command, success: true });
          break;
        case 'modify':
          if (command.content === undefined) {
            throw new Error(`Content is missing for modify operation on ${command.path}`);
          }
          await sandpackOps.updateFile(command.path, command.content);
          logs.push(`File modified: ${command.path}`);
          commandResults.push({ command, success: true });
          break;
        case 'delete':
          await sandpackOps.deleteFile(command.path);
          logs.push(`File deleted: ${command.path}`);
          commandResults.push({ command, success: true });
          break;
        case 'refactor':
          // 'refactor' is a high-level command. The AI should break it down.
          // If we receive it here, it means it wasn't broken down.
          const refactorErrorMsg = `'refactor' command type should be broken down by the AI into create/modify/delete operations. Path: ${command.path}`;
          errors.push(refactorErrorMsg);
          commandResults.push({ command, success: false, error: refactorErrorMsg });
          overallSuccess = false;
          break;
        default:
          const unsupportedErrorMsg = `Unsupported command type: ${(command as any).type} for path ${command.path}`;
          errors.push(unsupportedErrorMsg);
          commandResults.push({ command, success: false, error: unsupportedErrorMsg });
          overallSuccess = false;
          break;
      }
    } catch (error) {
      const errorMsg = `Error executing ${command.type} on ${command.path}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg, error); // Log the full error object for better debugging
      errors.push(errorMsg);
      commandResults.push({ command, success: false, error: errorMsg });
      overallSuccess = false;
    }
  }

  // Handle shell_commands - log them, as direct execution is not secure/feasible here.
  // Dependency installation would require Sandpack setup changes.
  for (const cmd of plan.shell_commands) {
    logs.push(`Shell command (logged, not executed): ${cmd.command}`);
    if (cmd.command.toLowerCase().includes('install') || cmd.command.toLowerCase().includes('add')) {
      logs.push(`Note: Dependency command ('${cmd.command}') was logged. Actual installation requires manual Sandpack configuration update or a specialized agent action.`);
    }
  }
  
  if (errors.length > 0 && commandResults.some(r => !r.success)) {
    overallSuccess = false; // Ensure overallSuccess reflects command failures
  }

  logs.push('File command execution finished.');
  return {
    success: overallSuccess,
    commandResults,
    logs,
    errors,
  };
};
