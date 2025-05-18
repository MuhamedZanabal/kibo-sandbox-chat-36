
export interface ChatMessage {
  id: string;
  text: string;
  type: "user" | "system";
  timestamp: Date;
  details?: any;
}
