import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Vitest runs from apps/web, so these paths are relative to the package root.
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const webConfig = read("vite.config.ts");
const webHtml = read("index.html");
const elderlyConfig = read("../elderly-web/vite.config.ts");
const elderlyHtml = read("../elderly-web/index.html");

function manifestField(config: string, field: string): string | undefined {
  return config.match(new RegExp(`\\b${field}:\\s*"([^"]+)"`))?.[1];
}

function metaTitle(html: string): string | undefined {
  return html.match(/name="apple-mobile-web-app-title"\s+content="([^"]+)"/)?.[1];
}

describe("installed app names", () => {
  it("names the volunteer app Township Connect Volunteer, short name Volunteer", () => {
    expect(manifestField(webConfig, "name")).toBe("Township Connect Volunteer");
    expect(manifestField(webConfig, "short_name")).toBe("Volunteer");
    expect(metaTitle(webHtml)).toBe("Volunteer");
    expect(webHtml).toContain("<title>Township Connect</title>");
  });

  it("names the elderly app Township Connect", () => {
    expect(manifestField(elderlyConfig, "name")).toBe("Township Connect");
    expect(manifestField(elderlyConfig, "short_name")).toBe("Township Connect");
    expect(metaTitle(elderlyHtml)).toBe("Township Connect");
    expect(elderlyHtml).toContain("<title>Township Connect</title>");
  });

  it("keeps the installed apps distinct and drops the old product name", () => {
    expect(manifestField(webConfig, "name")).not.toBe(manifestField(elderlyConfig, "name"));
    for (const text of [webConfig, webHtml, elderlyConfig, elderlyHtml]) {
      expect(text).not.toMatch(/Help a Neighbour/);
    }
  });
});

describe("tab icons", () => {
  // The files each page points at must exist, or the browser tab shows a blank or broken icon.
  const apps = [
    { app: "volunteer app", dir: "." },
    { app: "elderly app", dir: "../elderly-web" },
    { app: "sign-in portal", dir: "../portal" },
  ];

  for (const { app, dir } of apps) {
    it(`gives the ${app} a tab icon and an iOS icon that exist`, () => {
      const html = read(`${dir}/index.html`);
      const icon = html.match(/<link rel="icon" href="([^"]+)"/)?.[1];
      const touch = html.match(/<link rel="apple-touch-icon" href="([^"]+)"/)?.[1];
      expect(icon).toBeTruthy();
      expect(touch).toBeTruthy();
      for (const href of [icon, touch]) {
        expect(existsSync(resolve(process.cwd(), dir, "public", (href ?? "").slice(1)))).toBe(true);
      }
    });
  }
});
