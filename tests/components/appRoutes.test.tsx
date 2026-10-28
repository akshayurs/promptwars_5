import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import GlobalError from "@/app/global-error";
import HomePage, { metadata as homeMetadata } from "@/app/page";
import NotFound, { metadata as notFoundMetadata } from "@/app/not-found";
import PlanPage, { metadata as planMetadata } from "@/app/plan/page";
import EditEventPage, { metadata as editMetadata } from "@/app/plan/edit/page";
import EditLoading from "@/app/plan/edit/loading";
import PlanLoading from "@/app/plan/loading";
import SummaryPage, { metadata as summaryMetadata } from "@/app/plan/summary/page";
import SummaryLoading from "@/app/plan/summary/loading";
import RootLayout, { metadata, viewport } from "@/app/layout";

const connection = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock("next/server", () => ({ connection }));
vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "font-geist-test" }) }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/plan",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("page metadata", () => {
  it.each([
    ["home", homeMetadata, "Plan a new event"],
    ["not found", notFoundMetadata, "Page not found"],
    ["workspace", planMetadata, "Workspace"],
    ["edit", editMetadata, "Edit event details"],
    ["summary", summaryMetadata, "Summary"],
  ])("titles the %s page", (_name, pageMetadata, title) => {
    expect(pageMetadata.title).toBe(title);
  });

  it.each([planMetadata, editMetadata, summaryMetadata])(
    "keeps browser-local plan pages out of search indexes",
    (pageMetadata) => {
      expect(pageMetadata.robots).toEqual({ index: false, follow: false });
    },
  );
});

describe("pages", () => {
  it("renders the intake home page with a single h1 and the form", () => {
    render(<HomePage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("list", { name: "Every plan includes" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Generate plan" })).toBeVisible();
  });

  it("renders the not-found page with a way back", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Back to the intake form/ })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it.each([
    ["workspace", PlanPage, "Workspace"],
    ["edit", EditEventPage, "Edit event details"],
    ["summary", SummaryPage, "Summary"],
  ])("renders the %s page without a saved plan", async (_name, Page, heading) => {
    render(<Page />);
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeVisible();
  });

  it.each([
    ["workspace", PlanLoading, "Workspace"],
    ["edit", EditLoading, "Edit event details"],
    ["summary", SummaryLoading, "Summary"],
  ])("shows a status while the %s page loads", (_name, Loading, heading) => {
    render(<Loading />);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your plan…");
  });
});

describe("root layout", () => {
  const renderLayout = async (): Promise<string> => {
    const element: ReactElement = await RootLayout({ children: <p>Page body</p> });
    return renderToStaticMarkup(element);
  };

  it("waits for the request before rendering so the nonce CSP applies", async () => {
    connection.mockResolvedValueOnce(undefined);
    await renderLayout();
    expect(connection).toHaveBeenCalledTimes(1);
  });

  it("renders the skip link, navigation, main landmark and footer around the page", async () => {
    connection.mockResolvedValueOnce(undefined);
    const markup = await renderLayout();
    expect(markup).toContain('<html lang="en" class="font-geist-test');
    expect(markup).toContain('href="#main"');
    expect(markup).toContain('aria-label="Primary"');
    expect(markup).toContain('<main id="main" tabindex="-1"');
    expect(markup).toContain("<p>Page body</p>");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("stored only in this browser");
  });

  it("declares the site title template and a light and dark theme colour", () => {
    expect(metadata.title).toEqual({ default: "EventCraft", template: "%s · EventCraft" });
    expect(viewport.themeColor).toHaveLength(2);
  });
});

describe("global error page", () => {
  it("renders a complete document with the reference id", () => {
    const error = Object.assign(new Error("boom"), { digest: "g-1" });
    const markup = renderToStaticMarkup(<GlobalError error={error} retry={vi.fn()} />);
    expect(markup).toContain('<html lang="en">');
    expect(markup).toContain("Something went wrong · EventCraft");
    expect(markup).toContain("g-1");
    expect(markup).toContain("Try again");
  });
});
