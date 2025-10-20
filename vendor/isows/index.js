const fallback = class {
  constructor() {
    throw new Error("WebSocket implementation is not available in this environment.");
  }
};

const WebSocketImpl = typeof WebSocket === "function" ? WebSocket : fallback;

module.exports = { WebSocket: WebSocketImpl, default: WebSocketImpl };
