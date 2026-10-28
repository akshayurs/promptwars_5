import { act, renderHook } from "@testing-library/react";

import { useRefinement } from "@/components/refine/useRefinement";
import type { requestRefinement } from "@/lib/client";

import { makePlan, makeWorkspace } from "./fixtures";

const setup = (savedAt: () => string | undefined) => {
  const workspace = makeWorkspace();
  const refine = vi.fn<typeof requestRefinement>();
  const onApply = vi.fn();
  const hook = renderHook(() =>
    useRefinement({ workspace, onApply, onUndo: vi.fn() }, { requestRefinement: refine, savedAt }),
  );
  act(() => {
    hook.result.current.setInstruction("  add a dessert bar ");
  });
  return { workspace, refine, onApply, hook };
};

describe("useRefinement with injected dependencies", () => {
  it("sends the trimmed instruction with an abort signal and applies the result", async () => {
    const workspace = makeWorkspace();
    const { refine, onApply, hook } = setup(() => workspace.savedAt);
    const next = makePlan({ summary: "With a dessert bar." });
    refine.mockResolvedValueOnce({ ok: true, value: next });
    await act(() => hook.result.current.submit());
    expect(refine).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ instruction: "add a dessert bar" }),
      expect.any(AbortSignal),
    );
    expect(onApply).toHaveBeenCalledExactlyOnceWith(next);
    expect(hook.result.current.instruction).toBe("");
    expect(hook.result.current.status?.tone).toBe("success");
  });

  it("explains an event date outside the planning window instead of a generic error", async () => {
    const workspace = makeWorkspace();
    const { refine, onApply, hook } = setup(() => workspace.savedAt);
    refine.mockResolvedValueOnce({
      ok: false,
      message: "Please correct the highlighted fields.",
      issues: { "intake.eventDate": "Choose an event date between today and 5 years from now" },
    });
    await act(() => hook.result.current.submit());
    expect(onApply).not.toHaveBeenCalled();
    expect(hook.result.current.status).toEqual({
      tone: "error",
      text: expect.stringContaining("Edit event details") as string,
    });
  });

  it("discards the result when the stored workspace changed meanwhile", async () => {
    const { refine, onApply, hook } = setup(() => "2099-01-01T00:00:00.000Z");
    refine.mockResolvedValueOnce({ ok: true, value: makePlan() });
    await act(() => hook.result.current.submit());
    expect(onApply).not.toHaveBeenCalled();
    expect(hook.result.current.status).toEqual({
      tone: "error",
      text: "The plan changed while refining. Try again.",
    });
    expect(hook.result.current.instruction).toBe("  add a dessert bar ");
  });
});
