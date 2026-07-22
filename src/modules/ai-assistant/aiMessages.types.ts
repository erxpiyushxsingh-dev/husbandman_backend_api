export interface AiMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
  lang?: "hi";
}
