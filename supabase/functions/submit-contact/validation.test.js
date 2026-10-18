import { describe, expect, it } from 'vitest';
import { readBoundedJson, validateContactInput } from './validation.ts';

function requestWithBody(body, headers = {}) {
  return new Request('https://portfolio.example/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

describe('contact endpoint request parsing', () => {
  it('parses valid JSON within the byte limit', async () => {
    const result = await readBoundedJson(requestWithBody('{"message":"hello"}'));
    expect(result).toEqual({ ok: true, value: { message: 'hello' } });
  });

  it('allows the maximum character count for multi-byte messages within the byte limit', async () => {
    const request = requestWithBody(JSON.stringify({ visitorEmail: 'person@example.com', message: '😀'.repeat(5000) }));
    const parsed = await readBoundedJson(request);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(validateContactInput(parsed.value).ok).toBe(true);
  });

  it('rejects oversized bodies before parsing from the content length', async () => {
    const result = await readBoundedJson(requestWithBody('{}', { 'content-length': '1025' }), 1024);
    expect(result).toEqual({ ok: false, reason: 'too_large' });
  });

  it('rejects oversized streamed bodies when content length is unavailable', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"message":"' + 'x'.repeat(2048) + '"}'));
        controller.close();
      },
    });
    const request = new Request('https://portfolio.example/contact', { method: 'POST', body, duplex: 'half' });
    expect(await readBoundedJson(request, 1024)).toEqual({ ok: false, reason: 'too_large' });
  });

  it('rejects malformed JSON and invalid UTF-8', async () => {
    expect(await readBoundedJson(requestWithBody('{'))).toEqual({ ok: false, reason: 'invalid' });
    const invalidUtf8 = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0xff]));
        controller.close();
      },
    });
    const request = new Request('https://portfolio.example/contact', { method: 'POST', body: invalidUtf8, duplex: 'half' });
    expect(await readBoundedJson(request)).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('trusted contact input validation', () => {
  it('trims valid fields and accepts the full message character limit', () => {
    const result = validateContactInput({ visitorEmail: ' person@example.com ', message: ` ${'😀'.repeat(5000)} ` });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.visitorEmail).toBe('person@example.com');
      expect(Array.from(result.value.messageBody)).toHaveLength(5000);
    }
  });

  it('rejects malformed values and inputs over configured limits', () => {
    expect(validateContactInput(null).ok).toBe(false);
    expect(validateContactInput({ visitorEmail: 'bad', message: 'Hello' }).ok).toBe(false);
    expect(validateContactInput({ visitorEmail: `${'a'.repeat(243)}@example.com`, message: 'Hello' }).ok).toBe(false);
    expect(validateContactInput({ visitorEmail: 'person@example.com', message: '😀'.repeat(5001) }).ok).toBe(false);
  });
});
