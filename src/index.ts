import { loadConfig } from "./config.js";
import { createApp } from "./app.js";

const config = loadConfig();
const { app, registry } = createApp(config);

app.listen(config.server.port, config.server.host, () => {
  console.log(
    `🤖 Chatbot server running at http://${config.server.host}:${config.server.port}`,
  );
  console.log(`   Providers: ${registry.listAvailable().join(", ") || "none"}`);
  console.log(`   Health: http://localhost:${config.server.port}/api/health`);
});
