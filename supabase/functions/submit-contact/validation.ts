export const MAX_CONTACT_REQUEST_BYTES = 24 * 1024;

type ParsedJson =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'invalid' | 'too_large' };

type ValidContactInput = {
  visitorEmail: string;
  messageBody: string;
};

export type ContactInputResult =
  | { ok: true; value: ValidContactInput }
  | { ok: false };

export async function readBoundedJson(
  request: Request,
  maxBytes = MAX_CONTACT_REQUEST_BYTES,
): Promise<ParsedJson> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes) {
    return { ok: false, reason: 'too_large' };
  }

  if (!request.body) return { ok: false, reason: 'invalid' };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        void reader.cancel().catch(() => {});
        return { ok: false, reason: 'too_large' };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: 'invalid' };
  } finally {
    reader.releaseLock();
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function characterCount(value: string) {
  return Array.from(value).length;
}

export function validateContactInput(input: unknown): ContactInputResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false };

  const raw = input as Record<string, unknown>;
  const visitorEmail = typeof raw.visitorEmail === 'string' ? raw.visitorEmail.trim() : '';
  const messageBody = typeof raw.message === 'string' ? raw.message.trim() : '';
  if (
    !visitorEmail
    || characterCount(visitorEmail) > 254
    || !isValidEmail(visitorEmail)
    || !messageBody
    || characterCount(messageBody) > 5000
  ) {
    return { ok: false };
  }

  return { ok: true, value: { visitorEmail, messageBody } };
}
