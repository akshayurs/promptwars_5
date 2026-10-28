import { describe, expect, it, vi } from "vitest";

import { requestPlan, requestRefinement } from "@/lib/client";

import { makeIntake, makePlan } from "./fixtures";

const stubFetch = (impl: () => Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("requestPlan", () => {
  it("returns a parsed plan on success and posts JSON", async () => {
    const plan = makePlan();
    const fetchMock = stubFetch(() => Promise.resolve(Response.json(plan)));
    const intake = makeIntake();
    const signal = new AbortController().signal;
    const result = await requestPlan(intake, signal);
    expect(result).toEqual({ ok: true, value: plan });
    expect(fetchMock).toHaveBeenCalledWith("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(intake),
      signal,
    });
  });

  it("works without a signal and omits it from the request", async () => {
    const fetchMock = stubFetch(() => Promise.resolve(Response.json(makePlan())));
    expect((await requestPlan(makeIntake())).ok).toBe(true);
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("signal");
  });

  it("maps server validation issues to a field map", async () => {
    stubFetch(() =>
      Promise.resolve(
        Response.json(
          { error: "Fix fields", issues: [{ path: "guestCount", message: "Too small" }] },
          { status: 400 },
        ),
      ),
    );
    expect(await requestPlan(makeIntake())).toEqual({
      ok: false,
      message: "Fix fields",
      issues: { guestCount: "Too small" },
    });
  });

  it("handles error bodies without issues", async () => {
    stubFetch(() => Promise.resolve(Response.json({ error: "Nope" }, { status: 502 })));
    expect(await requestPlan(makeIntake())).toEqual({ ok: false, message: "Nope", issues: {} });
  });

  it("handles non-JSON error bodies", async () => {
    stubFetch(() => Promise.resolve(new Response("oops", { status: 500 })));
    expect(await requestPlan(makeIntake())).toMatchObject({
      ok: false,
      message: "The request could not be completed.",
    });
  });

  it("reports unexpected success payloads", async () => {
    stubFetch(() => Promise.resolve(Response.json({ bad: true })));
    expect(await requestPlan(makeIntake())).toMatchObject({
      ok: false,
      message: "Unexpected response from server.",
    });
  });

  it("reports network errors and cancellations", async () => {
    stubFetch(() => Promise.reject(new TypeError("offline")));
    expect(await requestPlan(makeIntake())).toMatchObject({
      message: "Network error. Check your connection.",
    });
    const abort = new Error("aborted");
    abort.name = "AbortError";
    stubFetch(() => Promise.reject(abort));
    expect(await requestPlan(makeIntake())).toMatchObject({
      message: "The request was cancelled.",
    });
  });
});

describe("requestRefinement", () => {
  it("posts to /api/refine", async () => {
    const plan = makePlan();
    const fetchMock = stubFetch(() => Promise.resolve(Response.json(plan)));
    const body = { intake: makeIntake(), plan, instruction: "Change it" };
    const signal = new AbortController().signal;
    const result = await requestRefinement(body, signal);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  });

  it("works without a signal", async () => {
    stubFetch(() => Promise.resolve(Response.json(makePlan())));
    const result = await requestRefinement({
      intake: makeIntake(),
      plan: makePlan(),
      instruction: "Change it",
    });
    expect(result.ok).toBe(true);
  });
});
