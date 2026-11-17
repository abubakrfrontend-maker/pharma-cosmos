import test from "node:test";
import assert from "node:assert/strict";
import { createFeedbackHandler, readConfig, validateFeedback } from "../lib/feedback.mjs";

const timestamp = Date.parse("2026-11-16T12:00:00Z");
const env = {
  TELEGRAM_BOT_TOKEN: "123456789:TEST_ONLY_abcdefghijklmnopqrstuvwxyz",
  TELEGRAM_CHAT_ID: "-100123456789",
};
function data(overrides = {}) {
  return {
    type: "feedback", branch: "Umumiy murojaat", rating: 4,
    message: "Xizmatingiz uchun rahmat, taklifim bor.",
    name: "", phone: "", wantsReply: false, website: "",
    submissionId: "test_submission_123456", startedAt: timestamp - 5000,
    ...overrides,
  };
}
function request(body = data(), extra = {}) {
  return new Request("https://pharma.example/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://pharma.example",
      "CF-Connecting-IP": "192.0.2.10", ...extra.headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const success = () => Promise.resolve(Response.json({ ok: true, result: { message_id: 42 } }));
const build = (options = {}) => createFeedbackHandler({ now: () => timestamp, fetchImpl: success, ...options });

test("configuration status reveals no secrets; missing config refuses submission", async () => {
  let calls = 0;
  const handler = build({ fetchImpl: () => { calls++; return success(); } });
  assert.deepEqual(await handler.GET(new Request("https://pharma.example/api/feedback"), {}).json(), { configured: false });
  assert.deepEqual(await handler.GET(new Request("https://pharma.example/api/feedback"), env).json(), { configured: true });
  const response = await handler.POST(request(), {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ok, false);
  assert.equal(calls, 0);
});

test("validated submission sends plain Telegram text and waits for confirmed message ID", async () => {
  let payload;
  const handler = build({
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage");
      assert.equal(init.method, "POST");
      payload = JSON.parse(init.body);
      return success();
    },
  });
  const response = await handler.POST(request(data({ message: "<b>Markup emas</b>, oddiy foydalanuvchi fikri." })), { ...env, TELEGRAM_MESSAGE_THREAD_ID: "7" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.match(body.reference, /^PC-[0-9A-F]{10}$/);
  assert.equal(payload.chat_id, env.TELEGRAM_CHAT_ID);
  assert.equal(payload.message_thread_id, 7);
  assert.equal(payload.parse_mode, undefined);
  assert.match(payload.text, /17:00 \(UTC\+5\)/);
  assert.match(payload.text, /<b>Markup emas<\/b>/);
  assert.equal(JSON.stringify(body).includes(env.TELEGRAM_BOT_TOKEN), false);
});

test("rejects malformed fields, required callback phone, honeypot and too-fast submit", () => {
  const invalid = [
    { type: "anything" }, { rating: 6 }, { rating: "5" }, { message: "short" },
    { branch: "" }, { name: "x".repeat(81) }, { phone: "not a number" },
    { wantsReply: true, phone: "" }, { wantsReply: "yes" }, { website: "spam.example" },
    { startedAt: timestamp - 10 }, { submissionId: "short" }, { message: "x".repeat(1501) },
  ];
  for (const fields of invalid) assert.ok(validateFeedback(data(fields), timestamp).errors, JSON.stringify(fields));
  assert.ok(validateFeedback(data({ wantsReply: true, phone: "+998 90 123 45 67" }), timestamp).data);
  assert.ok(validateFeedback(data({ rating: 0 }), timestamp).data);
});

test("invalid feedback never calls Telegram", async () => {
  let calls = 0;
  const handler = build({ fetchImpl: () => { calls++; return success(); } });
  const response = await handler.POST(request(data({ wantsReply: true })), env);
  assert.equal(response.status, 400);
  assert.ok((await response.json()).errors.phone);
  assert.equal(calls, 0);
});

test("rejects foreign Origin and cross-site Fetch Metadata", async () => {
  const handler = build();
  assert.equal((await handler.POST(request(data(), { headers: { Origin: "https://attacker.example" } }), env)).status, 403);
  assert.equal((await handler.POST(request(data(), { headers: { "Sec-Fetch-Site": "cross-site" } }), env)).status, 403);
});

test("accepts the actual Host origin when Next canonicalizes the URL hostname", async () => {
  const handler = build();
  const localRequest = new Request("http://localhost:5173/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", Host: "127.0.0.1:5173", Origin: "http://127.0.0.1:5173" },
    body: JSON.stringify(data()),
  });
  assert.equal((await handler.POST(localRequest, env)).status, 200);
});

test("actual Host matching still rejects foreign origins, ports, protocols and forwarded hosts", async () => {
  const handler = build();
  const rejected = [
    { Origin: "https://attacker.example" },
    { Origin: "http://127.0.0.1:9999" },
    { Origin: "https://127.0.0.1:5173" },
    { Origin: "https://attacker.example", "X-Forwarded-Host": "attacker.example", "X-Forwarded-Proto": "https" },
    { Origin: "http://127.0.0.1:5173", "Sec-Fetch-Site": "cross-site" },
    { Origin: "http://attacker.example", Host: "127.0.0.1:5173@attacker.example" },
  ];
  for (const headers of rejected) {
    const localRequest = new Request("http://localhost:5173/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", Host: "127.0.0.1:5173", ...headers },
      body: JSON.stringify(data()),
    });
    assert.equal((await handler.POST(localRequest, env)).status, 403, JSON.stringify(headers));
  }
});

test("content type, JSON and byte size are enforced including streamed bodies", async () => {
  const handler = build();
  assert.equal((await handler.POST(request(data(), { headers: { "Content-Type": "text/plain" } }), env)).status, 415);
  assert.equal((await handler.POST(request("{bad json}"), env)).status, 400);
  assert.equal((await handler.POST(request("x".repeat(17000)), env)).status, 413);
  assert.equal((await handler.POST(request(data(), { headers: { "Content-Length": "999999" } }), env)).status, 413);
});

test("Telegram errors and misleading successful HTTP responses never appear successful", async () => {
  for (const fetchImpl of [
    () => Promise.resolve(Response.json({ ok: false, description: "Unauthorized" }, { status: 401 })),
    () => Promise.resolve(Response.json({ ok: false })),
    () => Promise.resolve(Response.json({ ok: true, result: {} })),
    () => Promise.reject(new Error("secret-bearing upstream error")),
    () => Promise.resolve(new Response("not json", { status: 200 })),
  ]) {
    const response = await build({ fetchImpl }).POST(request(), env);
    assert.equal(response.status, 502);
    const output = await response.json();
    assert.equal(output.ok, false);
    assert.equal(JSON.stringify(output).includes("secret-bearing"), false);
  }
});

test("timeout is reported honestly without leaking transport details", async () => {
  const handler = build({
    timeoutMs: 5,
    fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")));
    }),
  });
  assert.equal((await handler.POST(request(), env)).status, 502);
});

test("concurrent duplicates and a retry share one Telegram delivery", async () => {
  let calls = 0;
  const handler = build({
    fetchImpl: async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return success();
    },
  });
  const responses = await Promise.all([handler.POST(request(), env), handler.POST(request(), env)]);
  const bodies = await Promise.all(responses.map((response) => response.json()));
  assert.equal(calls, 1);
  assert.equal(bodies[0].reference, bodies[1].reference);
  const retry = await handler.POST(request(), env);
  assert.equal((await retry.json()).reference, bodies[0].reference);
  assert.equal(calls, 1);
});

test("reusing submission ID for changed content is rejected", async () => {
  const handler = build();
  await handler.POST(request(), env);
  assert.equal((await handler.POST(request(data({ message: "Bu butunlay boshqa murojaat matni." })), env)).status, 409);
});

test("failed sends are briefly deduplicated and can be retried after cooldown", async () => {
  let clock = timestamp;
  let calls = 0;
  const handler = build({
    now: () => clock,
    fetchImpl: () => { calls++; return calls === 1 ? Promise.reject(new Error("network")) : success(); },
  });
  assert.equal((await handler.POST(request(), env)).status, 502);
  assert.equal((await handler.POST(request(), env)).status, 502);
  assert.equal(calls, 1);
  clock += 31_000;
  assert.equal((await handler.POST(request(), env)).status, 200);
  assert.equal(calls, 2);
});

test("rate-limits distinct submissions, permits idempotent retries and expires the window", async () => {
  let clock = timestamp;
  const handler = build({ now: () => clock });
  for (let index = 0; index < 5; index++) {
    const response = await handler.POST(request(data({ submissionId: "submission_unique_" + index })), env);
    assert.equal(response.status, 200);
  }
  assert.equal((await handler.POST(request(data({ submissionId: "submission_unique_0" })), env)).status, 200);
  const limited = await handler.POST(request(data({ submissionId: "submission_unique_5" })), env);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "600");
  clock += 601_000;
  assert.equal((await handler.POST(request(data({ submissionId: "submission_unique_6" })), env)).status, 200);
});

test("invalid optional topic ID is treated as unconfigured", () => {
  assert.equal(readConfig({ ...env, TELEGRAM_MESSAGE_THREAD_ID: "oops" }).configured, false);
  assert.equal(readConfig({ ...env, TELEGRAM_MESSAGE_THREAD_ID: "-1" }).configured, false);
});

test("Vercel clients have separate limits and cannot evade limits with a Cloudflare header", async () => {
  const handler = build();
  const vercelEnv = { ...env, VERCEL: "1" };
  for (let index = 0; index < 5; index++) {
    const firstClient = request(data({ submissionId: "vercel_submission_" + index }), {
      headers: { "X-Forwarded-For": "198.51.100.10" },
    });
    assert.equal((await handler.POST(firstClient, vercelEnv)).status, 200);
  }
  const blocked = request(data({ submissionId: "vercel_submission_5" }), {
    headers: { "X-Forwarded-For": "198.51.100.10", "CF-Connecting-IP": "192.0.2.99" },
  });
  assert.equal((await handler.POST(blocked, vercelEnv)).status, 429);
  const secondClient = request(data({ submissionId: "vercel_submission_5" }), {
    headers: { "X-Forwarded-For": "198.51.100.11" },
  });
  assert.equal((await handler.POST(secondClient, vercelEnv)).status, 200);
});

test("forwarded headers are not trusted outside Vercel", async () => {
  const handler = build();
  for (let index = 0; index < 5; index++) {
    assert.equal((await handler.POST(request(data({ submissionId: "local_submission_" + index }), {
      headers: { "X-Forwarded-For": "198.51.100." + index },
    }), env)).status, 200);
  }
  assert.equal((await handler.POST(request(data({ submissionId: "local_submission_5" }), {
    headers: { "X-Forwarded-For": "198.51.100.99" },
  }), env)).status, 429);
});

