import type { Request, Response } from "express";
import type { ChatService } from "../services/chat-service.js";
import { SessionStore, SessionNotFoundError } from "../services/session-store.js";

export class SessionController {
  private readonly chatService: ChatService;
  private readonly sessionStore: SessionStore;

  constructor(chatService: ChatService, sessionStore: SessionStore) {
    this.chatService = chatService;
    this.sessionStore = sessionStore;
  }

  createSession = (_req: Request, res: Response): void => {
    const session = this.sessionStore.create();
    res.status(201).json({
      sessionId: session.id,
      createdAt: new Date(session.createdAt).toISOString(),
    });
  };

  getSession = (req: Request, res: Response): void => {
    const sessionId = req.params.sessionId as string;
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found or expired" });
      return;
    }

    res.json({
      sessionId: session.id,
      messageCount: session.messages.length,
      createdAt: new Date(session.createdAt).toISOString(),
      lastActiveAt: new Date(session.lastActiveAt).toISOString(),
    });
  };

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const { sessionId, message, provider } = req.body as {
      sessionId: string;
      message: string;
      provider?: string;
    };

    try {
      this.sessionStore.addMessage(sessionId, {
        role: "user",
        content: message,
      });

      const session = this.sessionStore.get(sessionId)!;
      const response = await this.chatService.sendMessage(
        session.messages,
        provider,
      );

      this.sessionStore.addMessage(sessionId, {
        role: "assistant",
        content: response.content,
      });

      res.json({
        ...response,
        sessionId,
        messageCount: session.messages.length,
      });
    } catch (err) {
      if (err instanceof SessionNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  };

  streamMessage = async (req: Request, res: Response): Promise<void> => {
    const { sessionId, message, provider } = req.body as {
      sessionId: string;
      message: string;
      provider?: string;
    };

    try {
      this.sessionStore.addMessage(sessionId, {
        role: "user",
        content: message,
      });

      const session = this.sessionStore.get(sessionId)!;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullContent = "";

      try {
        for await (const chunk of this.chatService.streamMessage(
          session.messages,
          provider,
        )) {
          fullContent += chunk.content;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } finally {
        if (fullContent) {
          this.sessionStore.addMessage(sessionId, {
            role: "assistant",
            content: fullContent,
          });
        }
        res.end();
      }
    } catch (err) {
      if (err instanceof SessionNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  };

  deleteSession = (req: Request, res: Response): void => {
    const deleted = this.sessionStore.delete(req.params.sessionId as string);
    if (!deleted) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.status(204).end();
  };
}
