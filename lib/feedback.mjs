/**
 * Telegram feedback transport. All secrets are supplied by the server runtime.
 * Rate limiting and idempotency are bounded, in-memory, per Worker isolate:
 * useful for accidental double submits/basic spam, not global guarantees.
 * A durable store/platform rate limit is needed for cross-isolate enforcement.
 */
const TYPES = {
  feedback: "Fikr-mulohaza",
  suggestion: "Taklif",
  complaint: "Shikoyat",
  thanks: "Minnatdorchilik",
};
const MAX_BODY_BYTES = 16_384;
const MAX_ENTRIES = 1_000;
const RATE_WINDOW = 10 * 60_000;
const RATE_LIMIT = 5;
const SUCCESS_TTL = 60 * 60_000;
const FAILURE_TTL = 30_000;

function json(body, status = 200, extra = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
  });
}

export function readConfig(env = {}) {
  const token = typeof env.TELEGRAM_BOT_TOKEN === "string" ? env.TELEGRAM_BOT_TOKEN.trim() : "";
  const chatId = typeof env.TELEGRAM_CHAT_ID === "string" ? env.TELEGRAM_CHAT_ID.trim() : "";
  const threadRaw = typeof env.TELEGRAM_MESSAGE_THREAD_ID === "string" ? env.TELEGRAM_MESSAGE_THREAD_ID.trim() : "";
  const threadId = threadRaw ? Number(threadRaw) : undefined;
  const configured = /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(token) &&
    /^(-?\d+|@[A-Za-z][A-Za-z0-9_]{4,})$/.test(chatId) &&
    (!threadRaw || (Number.isSafeInteger(threadId) && threadId > 0));
  return { configured, token, chatId, threadId };
}

export function validateFeedback(value, now = Date.now()) {
  const errors = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { errors: { form: "Ma’lumotlar shakli noto‘g‘ri." } };
  }
  const clean = (field, max, required = false, min = 0) => {
    if (value[field] == null && !required) return "";
    if (typeof value[field] !== "string") {
      errors[field] = "Matn kiriting.";
      return "";
    }
    const text = value[field].trim();
    if (text.length > max || (required && text.length < min)) {
      errors[field] = field === "message"
        ? "Fikringiz 10–1500 belgidan iborat bo‘lsin."
        : field === "branch"
          ? "Filial yoki «Umumiy murojaat»ni kiriting."
          : "Maydon uzunligini tekshiring.";
    }
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
      errors[field] = "Matndagi noto‘g‘ri belgilarni olib tashlang.";
    }
    return text;
  };
  const type = typeof value.type === "string" ? value.type : "";
  if (!Object.hasOwn(TYPES, type)) errors.type = "Murojaat turini tanlang.";
  const branch = clean("branch", 160, true, 2);
  const message = clean("message", 1500, true, 10);
  const name = clean("name", 80);
  const phone = clean("phone", 30);
  const website = clean("website", 200);
  if (website) errors.form = "Murojaatni tekshirib, qayta yuboring.";
  if (value.wantsReply !== undefined && typeof value.wantsReply !== "boolean") {
    errors.wantsReply = "Javob olish tanlovini tekshiring.";
  }
  const wantsReply = value.wantsReply === true;
  if ((phone && (!/^\+?[\d\s()-]+$/.test(phone) || phone.replace(/\D/g, "").length < 9 || phone.replace(/\D/g, "").length > 15)) || (wantsReply && !phone)) {
    errors.phone = "Javob olish uchun to‘g‘ri telefon raqamini kiriting.";
  }
  const rating = value.rating == null || value.rating === 0 ? null : value.rating;
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    errors.rating = "Baho 1 dan 5 gacha bo‘lishi kerak.";
  }
  const submissionId = typeof value.submissionId === "string" ? value.submissionId : "";
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(submissionId)) errors.form = "Sahifani yangilab, qayta urinib ko‘ring.";
  if (value.startedAt !== undefined) {
    if (typeof value.startedAt !== "number" || !Number.isFinite(value.startedAt) || value.startedAt > now + 60_000 || now - value.startedAt < 1500) {
      errors.form = "Biroz kutib, murojaatingizni qayta yuboring.";
    }
  }
  if (Object.keys(errors).length) return { errors };
  return { data: { type, branch, rating, message, name, phone, wantsReply, submissionId } };
}

async function readLimitedJson(request) {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    throw new RangeError("body");
  }
  if (!request.body) throw new SyntaxError("body");
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RangeError("body");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

async function digest(cryptoImpl, text) {
  const bytes = await cryptoImpl.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

export function formatTelegramMessage(data, reference, date) {
  const localDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent", dateStyle: "medium", timeStyle: "short",
  }).format(date);
  return [
    "PHARMA COSMOS · Mijoz murojaati",
    "№ " + reference,
    "Vaqt: " + localDate + " (UTC+5)",
    "Turi: " + TYPES[data.type],
    "Filial: " + data.branch,
    "Baho: " + (data.rating ? data.rating + "/5" : "Ko‘rsatilmagan"),
    "Ism: " + (data.name || "Ko‘rsatilmagan"),
    "Javob so‘ralgan: " + (data.wantsReply ? "Ha" : "Yo‘q"),
    "Telefon: " + (data.phone || "Ko‘rsatilmagan"),
    "",
    "Fikr:",
    data.message,
  ].join("\n");
}

export function createFeedbackHandler(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const recent = new Map();
  const rates = new Map();

  function prune(map, timestamp) {
    for (const [key, entry] of map) {
      if (entry.expires <= timestamp) map.delete(key);
    }
    // Do not evict an in-flight request; reject new work if capacity is reached.
    while (map.size >= MAX_ENTRIES) {
      const found = [...map].find(([, entry]) => !entry.pending);
      if (!found) break;
      map.delete(found[0]);
    }
  }

  return {
    GET(_request, env) {
      return json({ configured: readConfig(env).configured });
    },

    async POST(request, env) {
      const origin = request.headers.get("origin");
      if ((origin && origin !== new URL(request.url).origin) ||
          request.headers.get("sec-fetch-site") === "cross-site") {
        return json({ ok: false, message: "Murojaatni saytning o‘zidan yuboring." }, 403);
      }
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        return json({ ok: false, message: "So‘rov shakli noto‘g‘ri." }, 415);
      }
      let body;
      try { body = await readLimitedJson(request); }
      catch (error) {
        const large = error instanceof RangeError;
        return json({ ok: false, message: large ? "Murojaat hajmi juda katta." : "Ma’lumotlarni o‘qib bo‘lmadi." }, large ? 413 : 400);
      }
      const timestamp = now();
      const validation = validateFeedback(body, timestamp);
      if (validation.errors) {
        return json({ ok: false, message: "Belgilangan maydonlarni tekshiring.", errors: validation.errors }, 400);
      }
      const data = validation.data;
      const config = readConfig(env);
      if (!config.configured) {
        return json({ ok: false, message: "Fikr yuborish xizmati hali ulanmagan. Hozircha +998 77 277 03 33 orqali bog‘lanishingiz mumkin." }, 503);
      }

      // Only a trusted Cloudflare-provided IP header is used; no forwarded-IP trust.
      // A one-way hash avoids retaining raw visitor addresses in the limiter.
      const client = await digest(cryptoImpl, request.headers.get("cf-connecting-ip") || "local-or-unknown");
      const fingerprint = await digest(cryptoImpl, JSON.stringify(data));
      const key = client + ":" + data.submissionId;
      prune(recent, timestamp);
      prune(rates, timestamp);
      const existing = recent.get(key);
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          return json({ ok: false, message: "Matn o‘zgargan. Yangi murojaat sifatida qayta yuboring." }, 409);
        }
        const outcome = existing.pending ? await existing.pending : existing.result;
        return json(outcome.body, outcome.status, outcome.headers);
      }
      if (recent.size >= MAX_ENTRIES) {
        return json({ ok: false, message: "Xizmat band. Birozdan keyin qayta urinib ko‘ring." }, 503);
      }
      let rate = rates.get(client);
      if (!rate) {
        rate = { count: 0, expires: timestamp + RATE_WINDOW };
        rates.set(client, rate);
      }
      if (rate.count >= RATE_LIMIT) {
        return json({ ok: false, message: "Ko‘p murojaat yuborildi. Biroz kutib, qayta urinib ko‘ring." }, 429, {
          "Retry-After": String(Math.max(1, Math.ceil((rate.expires - timestamp) / 1000))),
        });
      }
      rate.count++;
      const reference = "PC-" + cryptoImpl.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
      const send = async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const payload = {
            chat_id: config.chatId,
            text: formatTelegramMessage(data, reference, new Date(timestamp)),
            link_preview_options: { is_disabled: true },
            ...(config.threadId ? { message_thread_id: config.threadId } : {}),
          };
          const response = await fetchImpl("https://api.telegram.org/bot" + config.token + "/sendMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          const result = await response.json();
          if (!response.ok || result?.ok !== true || !Number.isInteger(result?.result?.message_id)) {
            return {
              status: 502,
              headers: {},
              body: { ok: false, message: "Hozir murojaatni yuborib bo‘lmadi. Matningiz saqlanib qoldi. 30 soniyadan keyin qayta urinib ko‘ring." },
            };
          }
          return {
            status: 200,
            headers: {},
            body: { ok: true, reference, message: "Rahmat! Murojaatingiz mas’ul administratorlarga yuborildi." },
          };
        } catch {
          // Do not log the URL or upstream error: they can contain the bot token.
          return {
            status: 502,
            headers: {},
            body: { ok: false, message: "Yuborilganini tasdiqlay olmadik. Matningiz saqlanib qoldi. 30 soniyadan keyin qayta urinib ko‘ring yoki call-markazga qo‘ng‘iroq qiling." },
          };
        } finally {
          clearTimeout(timer);
        }
      };
      // Register before yielding, so concurrent identical requests share one send.
      const pending = send();
      const entry = { fingerprint, pending, expires: timestamp + SUCCESS_TTL, result: undefined };
      recent.set(key, entry);
      const result = await pending;
      entry.pending = undefined;
      entry.result = result;
      entry.expires = now() + (result.status === 200 ? SUCCESS_TTL : FAILURE_TTL);
      return json(result.body, result.status, result.headers);
    },
  };
}

