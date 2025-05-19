
import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { generateExecutionPlan, autoOptimize, type ExecutionPlan } from "@/services/aiService";
import { executeFileCommands, type SandpackFileOperations } from "@/services/executionService";
import { ChatMessage } from '@/types/chat';

interface UseChatManagerProps {
  currentProject: string;
  sandpackOps: SandpackFileOperations | null;
}

export const useChatManager = ({ currentProject, sandpackOps }: UseChatManagerProps) => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "I'm your AI software engineer assistant. How can I help you today?",
      type: "system",
      timestamp: new Date(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<ExecutionPlan | null>(null);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const executePlanAndOptimize = useCallback(async (planToExecute: ExecutionPlan) => {
    if (!sandpackOps) {
      toast({ title: "Error", description: "Sandbox operations not available.", variant: "destructive" });
      setIsProcessing(false);
      setPendingPlan(null);
      setIsAwaitingConfirmation(false);
      return;
    }

    const executionResult = await executeFileCommands(planToExecute, sandpackOps);
    
    executionResult.logs.forEach(log => console.log("Execution Log:", log));
    executionResult.errors.forEach(err => console.error("Execution Error Detail:", err));
    
    let finalSystemMessageText = "";

    if (executionResult.success) {
      finalSystemMessageText = "Main changes applied successfully! ";
      toast({ title: "Execution Successful", description: "Main changes applied." });

      setMessages(prev => [...prev, {
        id: `${Date.now()}-optimizing`,
        text: "Attempting auto-optimization...",
        type: "system",
        timestamp: new Date(),
      }]);

      const optimizationPlan = await autoOptimize(currentProject, messages.find(m => m.type === 'user')?.text || "User request context missing", planToExecute);
      if (optimizationPlan && optimizationPlan.commands.length > 0) {
        setMessages(prev => [...prev, {
          id: `${Date.now()}-opt-plan`,
          text: `Auto-optimization plan generated (Commands: ${optimizationPlan.commands.length}). Executing...`,
          type: "system",
          timestamp: new Date(),
          details: optimizationPlan,
        }]);
        const optResult = await executeFileCommands(optimizationPlan, sandpackOps);
        optResult.logs.forEach(log => console.log("Optimization Log:", log));
        optResult.errors.forEach(err => console.error("Optimization Error Detail:", err));
        
        finalSystemMessageText += optResult.success 
          ? "Auto-optimization completed successfully." 
          : "Auto-optimization encountered issues (check console).";
        toast({
          title: optResult.success ? "Optimization Successful" : "Optimization Issue",
          description: optResult.success ? "Code optimized." : "Optimization had issues. Check console.",
          variant: optResult.success ? "default" : "destructive",
        });
         setMessages(prev => [...prev, {
          id: `${Date.now()}-opt-result`,
          text: `Optimization Result: ${finalSystemMessageText.substring(finalSystemMessageText.indexOf("Auto-optimization"))}`,
          type: "system",
          timestamp: new Date(),
          details: optResult 
        }]);
      } else if (optimizationPlan && optimizationPlan.commands.length === 0) {
          finalSystemMessageText += "Auto-optimization analysis found no immediate actions to take.";
           toast({ title: "Optimization", description: "No optimization actions needed at this time." });
      } else {
        finalSystemMessageText += "Auto-optimization step was skipped or failed to generate a plan.";
        toast({ title: "Optimization Skipped", description: "Could not generate optimization plan.", variant: "default" });
      }
    } else {
      finalSystemMessageText = "Some operations couldn't be completed. Please review the details and check the console.";
      toast({
        variant: "destructive",
        title: "Execution Failed",
        description: `Operations failed. ${executionResult.errors.join('; ')}. Check console.`,
        duration: 7000,
      });
    }
    
    setMessages(prev => [...prev, {
      id: `${Date.now()}-result`,
      text: finalSystemMessageText.startsWith("Main changes applied successfully!") ? finalSystemMessageText : "Execution attempt finished.",
      type: "system",
      timestamp: new Date(),
      details: executionResult
    }]);
  }, [sandpackOps, currentProject, messages, toast, setMessages, setIsProcessing, setPendingPlan, setIsAwaitingConfirmation]);


  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    const userMessageText = message;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: userMessageText,
      type: "user",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setMessage("");

    try {
      setMessages(prev => [...prev, { id: `${Date.now()}-planning`, text: "Generating execution plan...", type: "system", timestamp: new Date() }]);
      const plan = await generateExecutionPlan(currentProject, userMessageText);

      if (!plan) {
        setMessages(prev => [...prev, {
          id: `${Date.now()}-error-plan`,
          text: "Failed to generate an execution plan. The AI might be unavailable or the request too complex. Please check console logs and try rephrasing.",
          type: "system",
          timestamp: new Date(),
        }]);
        toast({
          variant: "destructive",
          title: "Planning Error",
          description: "Could not generate an execution plan. Check console.",
        });
        setIsProcessing(false);
        return;
      }

      setPendingPlan(plan);
      setIsAwaitingConfirmation(true);
      setMessages(prev => [...prev, {
        id: `${Date.now()}-plan-review`,
        text: `Execution plan generated with ${plan.commands.length} file operations and ${plan.shell_commands.length} shell commands. Please review the details and approve or reject.`,
        type: "system",
        timestamp: new Date(),
        details: plan 
      }]);
    } catch (error) {
      console.error('Error processing message in handleSendMessage:', error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Critical Error",
        description: `Failed to process your request: ${errorText}`,
      });
      setMessages(prev => [...prev, {
        id: `${Date.now()}-critical-error`,
        text: `A critical error occurred: ${errorText}. Please check console and try again.`,
        type: "system",
        timestamp: new Date(),
      }]);
      setIsProcessing(false);
      setIsAwaitingConfirmation(false);
      setPendingPlan(null);
    }
  }, [message, isProcessing, currentProject, toast, setIsProcessing, setMessages, setMessage, setPendingPlan, setIsAwaitingConfirmation]);

  const handleApprovePlan = useCallback(async () => {
    if (!pendingPlan) return;

    setIsAwaitingConfirmation(false);
    
    setMessages(prev => [...prev, {
      id: `${Date.now()}-plan-approved`,
      text: "Plan approved. Proceeding with execution...",
      type: "system",
      timestamp: new Date(),
    }]);

    try {
      await executePlanAndOptimize(pendingPlan);
    } catch (error) {
      console.error('Error during approved plan execution:', error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred during execution.";
      toast({
        variant: "destructive",
        title: "Execution Critical Error",
        description: `Failed to execute approved plan: ${errorText}`,
      });
       setMessages(prev => [...prev, {
        id: `${Date.now()}-execution-critical-error`,
        text: `A critical error occurred during plan execution: ${errorText}. Please check console.`,
        type: "system",
        timestamp: new Date(),
      }]);
    } finally {
      setPendingPlan(null);
      setIsProcessing(false); 
    }
  }, [pendingPlan, executePlanAndOptimize, toast, setIsAwaitingConfirmation, setMessages, setPendingPlan, setIsProcessing]);

  const handleRejectPlan = useCallback(() => {
    setIsAwaitingConfirmation(false);
    setPendingPlan(null);
    setMessages(prev => [...prev, {
      id: `${Date.now()}-plan-rejected`,
      text: "Plan rejected. No changes were made.",
      type: "system",
      timestamp: new Date(),
    }]);
    setIsProcessing(false);
  }, [setIsAwaitingConfirmation, setMessages, setPendingPlan, setIsProcessing]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  return {
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
  };
};
