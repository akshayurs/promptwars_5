import { describe, expect, it } from "vitest";

import { LIMITS, WORKSPACE_VERSION } from "@/lib/constants";
import { readWorkspaceImport, type ImportResult } from "@/lib/importWorkspace";

import { makeWorkspace } from "./fixtures";

const IMPORT_MESSAGES = {
  tooLarge: "Choose a file smaller than 256 KB.",
  unreadable: "This file could not be read. Try choosing it again.",
  notJson: "This file is not valid JSON. Choose a plan you exported from EventCraft.",
  wrongShape:
    "This file is not an EventCraft plan, or it was exported by an older version of the app.",
};

const fileOf = (text: string): Blob => new Blob([text], { type: "application/json" });

// Hands the text over verbatim (Blob.text() would strip a leading byte order mark).
const parseWorkspaceImport = (text: string): Promise<ImportResult> =>
  readWorkspaceImport({ size: text.length, text: () => Promise.resolve(text) });

describe("readWorkspaceImport validation", () => {
  it("accepts an exported workspace, pretty-printed as the summary page writes it", async () => {
    const workspace = makeWorkspace();
    await expect(parseWorkspaceImport(JSON.stringify(workspace, null, 2))).resolves.toEqual({
      ok: true,
      workspace,
    });
  });

  it.each(["", "{", "not json", "{'version': 2}", "﻿{}"])(
    "rejects malformed JSON %j",
    async (text) => {
      await expect(parseWorkspaceImport(text)).resolves.toEqual({
        ok: false,
        message: IMPORT_MESSAGES.notJson,
      });
    },
  );

  it.each([
    ["null", null],
    ["an array", []],
    ["a plan without its workspace", makeWorkspace().plan],
    ["an older version", { ...makeWorkspace(), version: WORKSPACE_VERSION - 1 }],
    ["an unknown key", { ...makeWorkspace(), owner: "someone" }],
    ["a malformed timestamp", { ...makeWorkspace(), savedAt: "yesterday" }],
  ])("rejects %s", async (_label, value) => {
    await expect(parseWorkspaceImport(JSON.stringify(value))).resolves.toEqual({
      ok: false,
      message: IMPORT_MESSAGES.wrongShape,
    });
  });

  it("rejects a plan whose budget exceeds the schema limits", async () => {
    const workspace = makeWorkspace();
    const tooMany = Array.from(
      { length: LIMITS.budgetLines.max + 1 },
      () => workspace.plan.budget[0],
    );
    const text = JSON.stringify({ ...workspace, plan: { ...workspace.plan, budget: tooMany } });
    await expect(parseWorkspaceImport(text)).resolves.toMatchObject({ ok: false });
  });
});

describe("readWorkspaceImport", () => {
  it("reads and validates a file", async () => {
    const workspace = makeWorkspace();
    await expect(readWorkspaceImport(fileOf(JSON.stringify(workspace)))).resolves.toEqual({
      ok: true,
      workspace,
    });
  });

  it("rejects a file over the size cap without reading it", async () => {
    let read = false;
    const file = {
      size: LIMITS.importFileBytes + 1,
      text: (): Promise<string> => {
        read = true;
        return Promise.resolve("{}");
      },
    };
    await expect(readWorkspaceImport(file)).resolves.toEqual({
      ok: false,
      message: IMPORT_MESSAGES.tooLarge,
    });
    expect(read).toBe(false);
  });

  it("accepts a file exactly at the size cap", async () => {
    const text = " ".repeat(LIMITS.importFileBytes);
    const result = await readWorkspaceImport(fileOf(text));
    expect(result).toEqual({ ok: false, message: IMPORT_MESSAGES.notJson });
  });

  it("reports a file the browser cannot read", async () => {
    const file = {
      size: 10,
      text: (): Promise<string> => Promise.reject(new Error("NotReadable")),
    };
    await expect(readWorkspaceImport(file)).resolves.toEqual({
      ok: false,
      message: IMPORT_MESSAGES.unreadable,
    });
  });
});
