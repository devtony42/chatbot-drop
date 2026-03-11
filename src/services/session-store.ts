import { randomUUID } from "node:crypto";
import type { Session } from "../types/index.js";
import type { ChatMessage } from "../types/index.js";

interface SessionStoreConfig {
  maxSessionAgeMs: number;
  maxMessagesPerSession: number;
  cleanupIntervalMs: number;
}

const DEFAULT_CONFIG: SessionStoreConfig = {
  maxSessionAgeMs: 30 * 60 * 1000, // 30 minutes
  maxMessagesPerSession: 100,
  cleanupIntervalMs: 60 * 1000, // 1 minute
};

/**
 * In-memory session store with automatic expiry cleanup.
 * Tracks conversation history per session so clients don't
 * need to resend the full message array on each request.
 */
export class SessionStore {
  private readonly sessions = new Map<string, Session>();
  private readonly config: SessionStoreConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<SessionStoreConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  create(): Session {
    const session: Session = {
      id: randomUUID(),
      messages: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): Session | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    if (this.isExpired(session)) {
      this.sessions.delete(id);
      return undefined;
    }

    return session;
  }

  addMessage(id: string, message: ChatMessage): Session {
    const session = this.get(id);
    if (!session) {
      throw new SessionNotFoundError(id);
    }

    session.messages.push(message);
    session.lastActiveAt = Date.now();

    if (session.messages.length > this.config.maxMessagesPerSession) {
      session.messages = session.messages.slice(-this.config.maxMessagesPerSession);
    }

    return session;
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }

  getActiveCount(): number {
    return this.sessions.size;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.sessions.clear();
  }

  private isExpired(session: Session): boolean {
    return Date.now() - session.lastActiveAt > this.config.maxSessionAgeMs;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      for (const [id, session] of this.sessions) {
        if (this.isExpired(session)) {
          this.sessions.delete(id);
        }
      }
    }, this.config.cleanupIntervalMs);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }
}

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session "${id}" not found or expired`);
    this.name = "SessionNotFoundError";
  }
}
