import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.APP_URL || "http://localhost:3001";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.resolve("export", `screenshots-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 430, height: 932 },
});

const waitStable = async () => {
  await page.waitForTimeout(900);
};

const shot = async (name) => {
  await waitStable();
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: true,
  });
};

await page.goto(baseUrl, { waitUntil: "networkidle" });
await waitStable();

await shot("01-home");

await page.getByRole("button", { name: "성경 탭" }).click();
await shot("02-read");

await page.getByRole("button", { name: "통독 탭" }).click();
await shot("03-plan");

await page.getByRole("button", { name: "암송 탭" }).click();
await shot("04-memory");

await page.getByRole("button", { name: "저장 탭" }).click();
await shot("05-saved");

await page.getByRole("button", { name: "홈 탭" }).click();
await waitStable();
await page.getByRole("button", { name: "설정" }).first().click();
await shot("06-settings");

await browser.close();

console.log(outDir);
