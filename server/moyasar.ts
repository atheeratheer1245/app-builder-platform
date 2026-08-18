const MOYASAR_API_BASE = "https://api.moyasar.com/v1";

type MoyasarInvoicePayload = {
  id?: unknown;
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
  url?: unknown;
};

export type MoyasarInvoice = {
  id: string;
  status: "initiated" | "paid" | "failed" | "refunded" | "canceled" | "on_hold" | "expired" | "voided";
  amount: number;
  currency: string;
  url?: string;
};

export function getMoyasarSecretKey() {
  const secretKey = process.env.MOYASAR_SECRET_KEY;
  if (!secretKey || !/^sk_(test|live)_[A-Za-z0-9_]+$/.test(secretKey)) {
    throw new Error("Moyasar secret key is not configured");
  }
  return secretKey;
}

function getAuthorizationHeader() {
  return `Basic ${Buffer.from(`${getMoyasarSecretKey()}:`).toString("base64")}`;
}

function parseInvoice(payload: MoyasarInvoicePayload, expectsUrl: boolean): MoyasarInvoice {
  const statuses = new Set(["initiated", "paid", "failed", "refunded", "canceled", "on_hold", "expired", "voided"]);
  if (typeof payload.id !== "string" || !payload.id || typeof payload.status !== "string" || !statuses.has(payload.status) || typeof payload.amount !== "number" || typeof payload.currency !== "string") {
    throw new Error("Moyasar returned an invalid invoice response");
  }
  if (expectsUrl && (typeof payload.url !== "string" || !payload.url.startsWith("https://"))) {
    throw new Error("Moyasar did not provide a safe hosted checkout URL");
  }
  return { id: payload.id, status: payload.status as MoyasarInvoice["status"], amount: payload.amount, currency: payload.currency, ...(typeof payload.url === "string" ? { url: payload.url } : {}) };
}

async function moyasarRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${MOYASAR_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: getAuthorizationHeader(), Accept: "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => null) as MoyasarInvoicePayload | { message?: unknown } | null;
  if (!response.ok) {
    const providerMessage = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? `: ${body.message}` : "";
    throw new Error(`Moyasar API request failed (${response.status})${providerMessage}`);
  }
  return body as MoyasarInvoicePayload;
}

export async function createMoyasarInvoice(input: {
  amountHalalas: number;
  description: string;
  callbackUrl: string;
  successUrl: string;
  backUrl: string;
}) {
  const payload = await moyasarRequest("/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amountHalalas,
      currency: "SAR",
      description: input.description,
      callback_url: input.callbackUrl,
      success_url: input.successUrl,
      back_url: input.backUrl,
    }),
  });
  return parseInvoice(payload, true);
}

export async function getMoyasarInvoice(invoiceId: string) {
  if (!/^[0-9a-f-]{16,}$/i.test(invoiceId)) throw new Error("Invalid Moyasar invoice identifier");
  const payload = await moyasarRequest(`/invoices/${encodeURIComponent(invoiceId)}`);
  return parseInvoice(payload, false);
}

export function mapMoyasarInvoiceStatus(status: MoyasarInvoice["status"]) {
  if (status === "paid") return "paid" as const;
  if (status === "failed") return "failed" as const;
  if (status === "refunded") return "refunded" as const;
  if (status === "canceled" || status === "expired" || status === "voided") return "cancelled" as const;
  return "pending" as const;
}
