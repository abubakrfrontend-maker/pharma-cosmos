import { defineConfig } from "vite";
import vinext from "vinext";

// A Node-only local preview for machines where the workerd runtime cannot start.
// Production still uses vite.config.ts and the Sites Cloudflare integration.
export default defineConfig({
  plugins: [
    {
      name: "local-worker-env",
      enforce: "pre",
      resolveId(id) { if (id === "cloudflare:workers") return "\0local-worker-env"; },
      load(id) { if (id === "\0local-worker-env") return "export const env = process.env;"; },
    },
    vinext(),
  ],
  server: { host: "127.0.0.1", port: 5173 },
});
