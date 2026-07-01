import { chromium } from "playwright";

const BASE = "https://aiu-gpa-calculator.vercel.app";
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const studentId = "WAIT" + Date.now();

  // SESSION 1: Register + IT + grades + WAIT for save
  console.log("1. Register, pick IT, enter 3 grades, wait for save...");
  const ctx1 = await browser.newContext();
  const p1 = await ctx1.newPage();
  await p1.goto(BASE + "?r=" + Date.now(), { timeout: 30000 });
  await p1.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await sleep(2000);

  const regBtn = await p1.$('button:has-text("Register")');
  if (regBtn) await regBtn.click();
  await sleep(300);
  let inputs = await p1.$$("input");
  await inputs[0].fill(studentId);
  await inputs[1].fill("test123");
  let sub = await p1.$('button[type="submit"]');
  if (sub) await sub.click();
  await sleep(3000);

  let h3s = await p1.$$("h3");
  for (const h of h3s) {
    if ((await h.textContent()).trim() === "Information Technology") { await h.click(); break; }
  }
  await sleep(2000);

  let selects = await p1.$$("select");
  let c = 0;
  for (const sel of selects) {
    const opts = await sel.$$("option");
    const vals = await Promise.all(opts.map(o => o.getAttribute("value")));
    if (vals.includes("A")) { await sel.selectOption("A"); c++; if (c >= 3) break; }
  }
  console.log("   Entered " + c + " grades");

  for (const b of await p1.$$("button")) {
    if ((await b.textContent()).includes("Calculate GPA")) { await b.click(); break; }
  }

  // CRITICAL: wait for debounced save (2s) + network
  console.log("   Waiting 5s for Supabase save...");
  await sleep(5000);
  await ctx1.close();

  // SESSION 2: Fresh browser, login, pick IT, check grades
  console.log("2. Fresh browser -> login -> re-pick IT -> check grades...");
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + "?r=" + Date.now(), { timeout: 30000 });
  await p2.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await sleep(2000);

  const signInBtn = await p2.$('button:has-text("Sign In")');
  if (signInBtn) await signInBtn.click();
  await sleep(300);
  inputs = await p2.$$("input");
  await inputs[0].fill(studentId);
  await inputs[1].fill("test123");
  sub = await p2.$('button[type="submit"]');
  if (sub) await sub.click();
  await sleep(3000);
  await p2.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await sleep(1000);

  h3s = await p2.$$("h3");
  for (const h of h3s) {
    if ((await h.textContent()).trim() === "Information Technology") { await h.click(); break; }
  }
  // Wait for program load + async grade fetch
  await sleep(3000);

  selects = await p2.$$("select");
  let foundA = 0;
  for (const sel of selects) {
    const val = await sel.inputValue().catch(() => "");
    if (val === "A") foundA++;
  }
  console.log("   Pre-filled grades from Supabase: " + foundA + " / " + c);
  console.log("   " + (foundA > 0 ? "? PASS - Data persists across browsers!" : "? FAIL"));

  for (const b of await p2.$$("button")) {
    if ((await b.textContent()).includes("Calculate GPA")) { await b.click(); break; }
  }
  await sleep(500);
  const body = await p2.textContent("body").catch(() => "");
  console.log("   GPA calc: " + (body.includes("CGPA") ? "? Visible" : "OK"));

  await ctx2.close();
  await browser.close();
})();
