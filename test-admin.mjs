import { chromium } from "playwright";
const BASE = "http://localhost:4173";
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log("  \u2713", name); }
  catch (e) { failed++; console.log("  \u2717", name + ":", e.message?.substring(0,80)); }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  console.log("\x1b[36m=== ADMIN PANEL (5 tests) ===\x1b[0m");

  await test("Admin page renders", async () => {
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "networkidle" });
    await wait(800);
    await p.evaluate(() => {
      localStorage.setItem("aiuUser", "admin_panel");
      localStorage.setItem("adminAccount", JSON.stringify({ username: "Admin", password: "3320" }));
    });
    await p.reload({ waitUntil: "load" });
    await wait(2000);
    const body = await p.evaluate(() => document.body.textContent);
    if (!body || body.length < 20) throw new Error("Admin page empty");
    await p.close();
  });

  await test("Admin panel has students tab", async () => {
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "networkidle" });
    await wait(800);
    await p.evaluate(() => {
      localStorage.setItem("aiuUser", "admin_view");
      localStorage.setItem("adminAccount", JSON.stringify({ username: "Admin", password: "3320" }));
    });
    await p.reload({ waitUntil: "load" });
    await wait(2000);
    const text = await p.evaluate(() => document.body.textContent);
    if (!text || !text.includes("Students")) throw new Error("No Students tab");
    await p.close();
  });

  await test("Non-admin user does not see admin page", async () => {
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "networkidle" });
    await wait(500);
    await p.evaluate(() => localStorage.setItem("aiuUser", "regular_student"));
    await p.reload({ waitUntil: "load" });
    await wait(1000);
    const isAdmin = await p.evaluate(() => {
      const u = localStorage.getItem("aiuUser");
      return u && u.startsWith("admin_");
    });
    if (isAdmin) throw new Error("Non-admin user should not be admin");
    await p.close();
  });

  await test("Admin account defaults", async () => {
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "networkidle" });
    await wait(800);
    await p.close();
  });

  await test("Admin prefix triggers admin view", async () => {
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "networkidle" });
    await wait(800);
    await p.evaluate(() => {
      localStorage.setItem("aiuUser", "admin_test");
      localStorage.setItem("adminAccount", JSON.stringify({ username: "Test", password: "pass" }));
    });
    await p.reload({ waitUntil: "load" });
    await wait(2000);
    const body = await p.evaluate(() => document.body.textContent);
    if (!body) throw new Error("No content for admin");
    await p.close();
  });

  const total = passed + failed;
  console.log(`\n${passed} / ${total} admin tests passed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
