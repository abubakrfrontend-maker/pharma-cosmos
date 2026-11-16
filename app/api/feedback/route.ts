import { env } from "cloudflare:workers";
import { createFeedbackHandler } from "../../../lib/feedback.mjs";

export const dynamic = "force-dynamic";

const handler = createFeedbackHandler();

export function GET(request: Request) {
  return handler.GET(request, env);
}

export function POST(request: Request) {
  return handler.POST(request, env);
}
