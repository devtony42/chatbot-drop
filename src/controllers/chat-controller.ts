import type { Request, Response } from "express";
import type { ChatService } from "../services/chat-service.js";
import type { ChatMessage } from "../types/index.js";

export class ChatController {
  private readonly chatService: ChatService;

  constructor(chatService: ChatService) {
    this.chatService = chatService;
  }

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const { messages, provider } = req.body as {
      messages: ChatMessage[];
      provider?: string;
    };

    const response = await this.chatService.sendMessage(messages, provider);
    res.json(response);
  };

  streamMessage = async (req: Request, res: Response): Promise<void> => {
    const { messages, provider } = req.body as {
      messages: ChatMessage[];
      provider?: string;
    };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      for await (const chunk of this.chatService.streamMessage(
        messages,
        provider,
      )) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } finally {
      res.end();
    }
  };

  listProviders = (_req: Request, res: Response): void => {
    const providers = this.chatService.listProviders();
    res.json({ providers });
  };
}
