import { describe, expect, it } from "vitest";

import { clientKey, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";

const post = (body: string, headers: Record<string, string> = {}): Request =>
  new Request("http://localhost/api", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });

describe("readJsonBody", () => {
  it("returns 415 for a wrong content type", async () => {
    const request = post("{}", { "content-type": "text/plain" });
    expect(await readJsonBody(request, 100)).toMatchObject({ ok: false, status: 415 });
  });

  it("returns 415 for a missing content type", async () => {
    const request = new Request("http://localhost/api", { method: "POST", body: "{}" });
    request.headers.delete("content-type");
    expect(await readJsonBody(request, 100)).toMatchObject({ ok: false, status: 415 });
  });

  it("accepts a content type with charset and mixed case", async () => {
    const request = post("{}", { "content-type": "Application/JSON; charset=utf-8" });
    expect(await readJsonBody(request, 100)).toEqual({ ok: true, value: {} });
  });

  it("returns 413 for a declared oversize body", async () => {
    const request = post("{}", { "content-length": "101" });
    expect(await readJsonBody(request, 100)).toMatchObject({ ok: false, status: 413 });
  });

  it("returns 413 for an actual oversize body without a declared length", async () => {
    const request = post(JSON.stringify({ a: "x".repeat(200) }));
    expect(await readJsonBody(request, 100)).toMatchObject({ ok: false, status: 413 });
  });

  it("counts bytes, not characters", async () => {
    const request = post(JSON.stringify("é".repeat(40)));
    expect(await readJsonBody(request, 60)).toMatchObject({ ok: false, status: 413 });
  });

  it("treats a non-numeric content-length as unknown", async () => {
    const request = post('{"a":1}', { "content-length": "abc" });
    expect(await readJsonBody(request, 100)).toEqual({ ok: true, value: { a: 1 } });
  });

  it("stops reading and cancels the stream once the cap is exceeded", async () => {
    let pulls = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(40).fill(32));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: stream,
      headers: { "content-type": "application/json" },
      duplex: "half",
    } as RequestInit);
    expect(await readJsonBody(request, 100)).toMatchObject({ ok: false, status: 413 });
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(10);
  });

  it("joins multiple chunks within the cap", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"a":'));
        controller.enqueue(encoder.encode('"é"}'));
        controller.close();
      },
    });
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: stream,
      headers: { "content-type": "application/json" },
      duplex: "half",
    } as RequestInit);
    expect(await readJsonBody(request, 100)).toEqual({ ok: true, value: { a: "é" } });
  });

  it("returns 400 for invalid UTF-8", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: new Uint8Array([0x22, 0xff, 0xfe, 0x22]),
      headers: { "content-type": "application/json" },
    });
    expect(await readJsonBody(request, 100)).toEqual({
      ok: false,
      status: 400,
      message: "Request body is not valid UTF-8",
    });
  });

  it("returns 400 for a missing body", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    expect(await readJsonBody(request, 100)).toMatchObject({ ok: false, status: 400 });
  });

  it("returns 400 for malformed JSON", async () => {
    expect(await readJsonBody(post("{nope"), 100)).toMatchObject({ ok: false, status: 400 });
  });

  it("returns the parsed value on success", async () => {
    expect(await readJsonBody(post('{"a":1}'), 100)).toEqual({ ok: true, value: { a: 1 } });
  });
});

describe("clientKey", () => {
  const withHeaders = (headers: Record<string, string>) =>
    new Request("http://localhost", { headers });

  it("uses the right-most x-forwarded-for entry appended by the trusted proxy", () => {
    expect(clientKey(withHeaders({ "x-forwarded-for": " spoofed , client-b " }))).toBe("client-b");
  });

  it("ignores empty x-forwarded-for segments", () => {
    expect(clientKey(withHeaders({ "x-forwarded-for": "client-a, ,  ," }))).toBe("client-a");
  });

  it("falls back to x-real-ip when x-forwarded-for has no usable entry", () => {
    expect(clientKey(withHeaders({ "x-forwarded-for": " , ", "x-real-ip": " client-d " }))).toBe(
      "client-d",
    );
  });

  it("ignores a blank x-real-ip", () => {
    expect(clientKey(withHeaders({ "x-real-ip": "  " }))).toBe("anonymous");
  });

  it("falls back to x-real-ip", () => {
    expect(clientKey(withHeaders({ "x-real-ip": "client-c" }))).toBe("client-c");
  });

  it("falls back to anonymous", () => {
    expect(clientKey(withHeaders({}))).toBe("anonymous");
  });
});

describe("responses", () => {
  it("jsonResponse sets no-store, request id, status and extra headers", async () => {
    const res = jsonResponse(
      { a: 1 },
      { status: 201, correlationId: "cid", headers: { "X-A": "b" } },
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Request-Id")).toBe("cid");
    expect(res.headers.get("X-A")).toBe("b");
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("errorResponse includes the correlationId in the body", async () => {
    const res = errorResponse({ error: "bad" }, { status: 400, correlationId: "cid" });
    expect(await res.json()).toEqual({ error: "bad", correlationId: "cid" });
    expect(res.headers.get("X-Request-Id")).toBe("cid");
  });
});
