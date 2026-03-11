import { describe, it, expect, afterEach } from "vitest";
import { SessionStore, SessionNotFoundError } from "../../src/services/session-store.js";

describe("SessionStore", () => {
  const stores: SessionStore[] = [];

  function createStore(config?: Parameters<typeof SessionStore.prototype.destroy extends () => void ? never : never>[0]) {
    const store = new SessionStore({
      cleanupIntervalMs: 60_000,
      ...config,
    });
    stores.push(store);
    return store;
  }

  afterEach(() => {
    for (const store of stores) store.destroy();
    stores.length = 0;
  });

  describe("create", () => {
    it("should create a session with a UUID and empty messages", () => {
      const store = createStore();
      const session = store.create();

      expect(session.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(session.messages).toEqual([]);
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.lastActiveAt).toBe(session.createdAt);
    });

    it("should create unique sessions", () => {
      const store = createStore();
      const a = store.create();
      const b = store.create();
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("get", () => {
    it("should return an existing session", () => {
      const store = createStore();
      const created = store.create();
      const found = store.get(created.id);
      expect(found?.id).toBe(created.id);
    });

    it("should return undefined for unknown session ids", () => {
      const store = createStore();
      expect(store.get("nonexistent-id")).toBeUndefined();
    });

    it("should return undefined for expired sessions", () => {
      const store = createStore({ maxSessionAgeMs: 1 });
      const session = store.create();

      // Force expiry by backdating lastActiveAt
      session.lastActiveAt = Date.now() - 100;

      expect(store.get(session.id)).toBeUndefined();
    });
  });

  describe("addMessage", () => {
    it("should append a message to the session", () => {
      const store = createStore();
      const session = store.create();

      store.addMessage(session.id, { role: "user", content: "Hello" });

      const updated = store.get(session.id)!;
      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0]).toEqual({
        role: "user",
        content: "Hello",
      });
    });

    it("should update lastActiveAt on message", () => {
      const store = createStore();
      const session = store.create();
      const originalTime = session.lastActiveAt;

      // Small delay to ensure different timestamp
      session.lastActiveAt = originalTime - 100;
      store.addMessage(session.id, { role: "user", content: "Hi" });

      const updated = store.get(session.id)!;
      expect(updated.lastActiveAt).toBeGreaterThan(originalTime - 100);
    });

    it("should throw SessionNotFoundError for unknown sessions", () => {
      const store = createStore();
      expect(() =>
        store.addMessage("fake-id", { role: "user", content: "Hi" }),
      ).toThrow(SessionNotFoundError);
    });

    it("should trim messages when exceeding max limit", () => {
      const store = createStore({ maxMessagesPerSession: 3 });
      const session = store.create();

      store.addMessage(session.id, { role: "user", content: "Message 1" });
      store.addMessage(session.id, { role: "assistant", content: "Reply 1" });
      store.addMessage(session.id, { role: "user", content: "Message 2" });
      store.addMessage(session.id, { role: "assistant", content: "Reply 2" });

      const updated = store.get(session.id)!;
      expect(updated.messages).toHaveLength(3);
      expect(updated.messages[0].content).toBe("Reply 1");
    });
  });

  describe("delete", () => {
    it("should remove an existing session", () => {
      const store = createStore();
      const session = store.create();
      expect(store.delete(session.id)).toBe(true);
      expect(store.get(session.id)).toBeUndefined();
    });

    it("should return false for unknown sessions", () => {
      const store = createStore();
      expect(store.delete("nonexistent")).toBe(false);
    });
  });

  describe("getActiveCount", () => {
    it("should track the number of active sessions", () => {
      const store = createStore();
      expect(store.getActiveCount()).toBe(0);

      store.create();
      store.create();
      expect(store.getActiveCount()).toBe(2);
    });
  });
});
