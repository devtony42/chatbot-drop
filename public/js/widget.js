/**
 * Agentic Chatbot Widget
 *
 * Drop-in chat widget that connects to the agentic-chatbot-starter backend.
 * Embed with a single <script> tag — no build step required.
 *
 * Usage:
 *   <script src="https://your-server.com/js/widget.js"
 *           data-server="https://your-server.com"
 *           data-title="Chat with us"
 *           data-greeting="Hi! How can I help?"
 *           data-stream="true"
 *           data-api-key="your-tenant-api-key">
 *   </script>
 */
(function () {
  "use strict";

  const script = document.currentScript;
  const serverUrl = script?.getAttribute("data-server") || "";
  const title = script?.getAttribute("data-title") || "Chat";
  const greeting =
    script?.getAttribute("data-greeting") || "Hi! How can I help you today?";
  const useStream = script?.getAttribute("data-stream") !== "false";
  const apiKey = script?.getAttribute("data-api-key") || "";

  // Theming: optional data-color, data-radius, data-font-size
  const themeColor    = script?.getAttribute("data-color")     || null;
  const themeRadius   = script?.getAttribute("data-radius")    || null;
  const themeFontSize = script?.getAttribute("data-font-size") || null;

  function getHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }
    return headers;
  }

  const messages = [];
  let isWaiting = false;

  /**
   * Apply data-color / data-radius / data-font-size as scoped CSS custom
   * properties on the container element so they cascade into all .acw-* rules
   * without touching the global stylesheet.
   */
  function applyTheme(container) {
    if (themeColor) {
      // Derive a slightly darker hover shade (15% luminance reduction).
      container.style.setProperty("--acw-primary", themeColor);
      container.style.setProperty("--acw-primary-hover", darkenHex(themeColor, 0.15));
      container.style.setProperty("--acw-bg-user", themeColor);
    }
    if (themeRadius) {
      container.style.setProperty("--acw-radius", themeRadius);
    }
    if (themeFontSize) {
      container.style.setProperty("--acw-font-size", themeFontSize);
    }
  }

  /**
   * Darken a hex colour by `amount` (0–1 fraction).
   * Falls back to the original value if the hex can't be parsed.
   */
  function darkenHex(hex, amount) {
    const clean = hex.replace(/^#/, "");
    if (!/^[0-9a-fA-F]{3,6}$/.test(clean)) return hex;
    const full = clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;
    const r = Math.max(0, Math.round(parseInt(full.slice(0, 2), 16) * (1 - amount)));
    const g = Math.max(0, Math.round(parseInt(full.slice(2, 4), 16) * (1 - amount)));
    const b = Math.max(0, Math.round(parseInt(full.slice(4, 6), 16) * (1 - amount)));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  function createWidget() {
    const container = document.createElement("div");
    container.className = "acw-container";
    container.innerHTML = buildWidgetHTML();
    applyTheme(container);
    document.body.appendChild(container);
    return container;
  }

  function buildWidgetHTML() {
    return `
      <div class="acw-panel" id="acw-panel">
        <div class="acw-header">
          <h3 class="acw-header-title">${escapeHTML(title)}</h3>
          <button class="acw-close" id="acw-close" aria-label="Close chat">&times;</button>
        </div>
        <div class="acw-messages" id="acw-messages">
          <div class="acw-message acw-message-assistant">${escapeHTML(greeting)}</div>
        </div>
        <div class="acw-typing" id="acw-typing">
          <div class="acw-typing-dots">
            <span class="acw-typing-dot"></span>
            <span class="acw-typing-dot"></span>
            <span class="acw-typing-dot"></span>
          </div>
        </div>
        <div class="acw-input-area">
          <input class="acw-input" id="acw-input" type="text"
                 placeholder="Type a message..." autocomplete="off" />
          <button class="acw-send" id="acw-send" aria-label="Send message">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
      <button class="acw-toggle" id="acw-toggle" aria-label="Open chat">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      </button>
    `;
  }

  function bindEvents(container) {
    const toggle = container.querySelector("#acw-toggle");
    const close = container.querySelector("#acw-close");
    const input = container.querySelector("#acw-input");
    const send = container.querySelector("#acw-send");
    const panel = container.querySelector("#acw-panel");

    toggle.addEventListener("click", () => {
      panel.classList.add("acw-open");
      toggle.style.display = "none";
      input.focus();
    });

    close.addEventListener("click", () => {
      panel.classList.remove("acw-open");
      toggle.style.display = "flex";
    });

    send.addEventListener("click", () => handleSend(container));

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(container);
      }
    });
  }

  function handleSend(container) {
    const input = container.querySelector("#acw-input");
    const text = input.value.trim();
    if (!text || isWaiting) return;

    input.value = "";
    messages.push({ role: "user", content: text });
    appendMessage(container, "user", text);

    if (useStream) {
      sendStreamRequest(container);
    } else {
      sendRequest(container);
    }
  }

  async function sendRequest(container) {
    isWaiting = true;
    setTyping(container, true);
    setSendEnabled(container, false);

    try {
      const response = await fetch(`${serverUrl}/api/chat`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      messages.push({ role: "assistant", content: data.content });
      appendMessage(container, "assistant", data.content);
    } catch (err) {
      appendMessage(
        container,
        "assistant",
        "Sorry, something went wrong. Please try again.",
      );
      console.error("[acw]", err);
    } finally {
      isWaiting = false;
      setTyping(container, false);
      setSendEnabled(container, true);
    }
  }

  async function sendStreamRequest(container) {
    isWaiting = true;
    setTyping(container, true);
    setSendEnabled(container, false);

    try {
      const response = await fetch(`${serverUrl}/api/chat/stream`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      setTyping(container, false);
      const messageEl = appendMessage(container, "assistant", "");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const chunk = JSON.parse(trimmed.slice(6));
          if (chunk.done) break;
          fullContent += chunk.content;
          messageEl.textContent = fullContent;
        }
      }

      messages.push({ role: "assistant", content: fullContent });
      scrollToBottom(container);
    } catch (err) {
      appendMessage(
        container,
        "assistant",
        "Sorry, something went wrong. Please try again.",
      );
      console.error("[acw]", err);
    } finally {
      isWaiting = false;
      setSendEnabled(container, true);
    }
  }

  function appendMessage(container, role, content) {
    const messagesEl = container.querySelector("#acw-messages");
    const div = document.createElement("div");
    div.className = `acw-message acw-message-${role}`;
    div.textContent = content;
    messagesEl.appendChild(div);
    scrollToBottom(container);
    return div;
  }

  function setTyping(container, visible) {
    const typing = container.querySelector("#acw-typing");
    typing.classList.toggle("acw-visible", visible);
  }

  function setSendEnabled(container, enabled) {
    const send = container.querySelector("#acw-send");
    send.disabled = !enabled;
  }

  function scrollToBottom(container) {
    const messagesEl = container.querySelector("#acw-messages");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Initialize from script tag attributes (standalone embed).
  function init() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${serverUrl}/css/widget.css`;
    document.head.appendChild(link);

    const container = createWidget();
    bindEvents(container);
  }

  /**
   * Public API — called by WordPress shortcode inline scripts to spawn
   * additional widget instances with per-shortcode config overrides.
   *
   * @param {Object} cfg
   * @param {string} [cfg.server]   - Backend URL
   * @param {string} [cfg.color]    - Primary hex colour (e.g. "#7c3aed")
   * @param {string} [cfg.radius]   - Border radius (e.g. "8px")
   * @param {string} [cfg.fontSize] - Font size (e.g. "13px")
   */
  function initFromConfig(cfg) {
    const baseUrl = cfg.server || serverUrl;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${baseUrl}/css/widget.css`;
    if (!document.querySelector(`link[href="${link.href}"]`)) {
      document.head.appendChild(link);
    }

    const container = document.createElement("div");
    container.className = "acw-container";
    container.innerHTML = buildWidgetHTML();

    if (cfg.color) {
      container.style.setProperty("--acw-primary", cfg.color);
      container.style.setProperty("--acw-primary-hover", darkenHex(cfg.color, 0.15));
      container.style.setProperty("--acw-bg-user", cfg.color);
    }
    if (cfg.radius)   { container.style.setProperty("--acw-radius",    cfg.radius); }
    if (cfg.fontSize) { container.style.setProperty("--acw-font-size", cfg.fontSize); }

    document.body.appendChild(container);
    bindEvents(container);
  }

  // Expose public API and flush any queued calls made before script loaded.
  window.ChatbotDrop = window.ChatbotDrop || {};
  window.ChatbotDrop.init = initFromConfig;
  document.dispatchEvent(new CustomEvent("chatbotdrop:ready"));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
