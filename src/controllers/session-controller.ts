import type { Request, Response } from "express";
import type { ChatService, ChatOverrides } from "../services/chat-service.js";
import { SessionStore, SessionNotFoundError } from "../services/session-store.js";
import type { TenantStore } from "../services/tenant-store.js";

export class SessionController {
  private readonly chatService: ChatService;
  private readonly sessionStore: SessionStore;
  private readonly tenantStore: TenantStore;

  constructor(
    chatService: ChatService,
    sessionStore: SessionStore,
    tenantStore: TenantStore,
  ) {
    this.chatService = chatService;
    this.sessionStore = sessionStore;
    this.tenantStore = tenantStore;
  }

  createSession = (req: Request, res: Response): void => {
    const session = this.sessionStore.create(req.tenant?.id);
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
      const overrides = this.getTenantOverrides(session.tenantId);
      const response = await this.chatService.sendMessage(
        session.messages,
        provider,
        overrides,
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
      const overrides = this.getTenantOverrides(session.tenantId);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullContent = "";

      try {
        for await (const chunk of this.chatService.streamMessage(
          session.messages,
          provider,
          overrides,
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

  private getTenantOverrides(tenantId?: string): ChatOverrides | undefined {
    if (!tenantId) return undefined;

    const tenant = this.tenantStore.get(tenantId);
    if (!tenant) return undefined;

    return {
      systemPrompt: tenant.systemPrompt,
      provider: tenant.provider,
      model: tenant.model,
      maxTokens: tenant.maxTokens,
      temperature: tenant.temperature,
    };
  }
}
