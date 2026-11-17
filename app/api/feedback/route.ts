import { createFeedbackHandler } from "../../../lib/feedback.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handler = createFeedbackHandler();

export function GET(request: Request) {
  return handler.GET(request, process.env);
}

export function POST(request: Request) {
  return handler.POST(request, process.env);
}
