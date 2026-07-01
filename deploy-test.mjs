import { chromium } from "playwright";

const BASE = "https://aiu-gpa-calculator.vercel.app";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function studentLogin(context, id) {
  const page = await context.newPage();
  page.on("pageerror", () => {});
  await page.goto(BASE + "?r=" + Date.now(), { timeout: 30000 });
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(BASE + "?r=" + Date.now(), { timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await sleep(2000);

  const regBtn = await page.$('button:has-text("Register")');
  if (regBtn) await regBtn.click();
  await sleep(300);

  const inputs = await page.$$('input[type="text"]');
  if (inputs.length === 0) { await page.close(); return null; }
  await inputs[0].fill(id);

  const pwInputs = await page.$$('input[type="password"]');
  if (pwInputs.length > 0) await pwInputs[0].fill("test123");

  let submit = await page.$('button[type="submit"]');
  if (submit) await submit.click();
  await sleep(3000);
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await sleep(1000);

  let body = await page.textContent("body").catch(() => "");
  if (body.includes("Select") || body.includes("Program")) return page;

  await page.goto(BASE + "?r=" + Date.now(), { timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await sleep(1500);

  const signInBtn = await page.$('button:has-text("Sign In")');
  if (signInBtn) await signInBtn.click();
  await sleep(300);

  const inputs2 = await page.$$('input[type="text"]');
  if (inputs2.length === 0) { await page.close(); return null; }
  await inputs2[0].fill(id);

  const pwInputs2 = await page.$$('input[type="password"]');
  if (pwInputs2.length > 0) await pwInputs2[0].fill("test123");

  submit = await page.$('button[type="submit"]');
  if (!submit) { await page.close(); return null; }
  await submit.click();
  await sleep(3000);
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await sleep(1000);
  return page;
}

async function clickProgram(page, name) {
  const h3s = await page.$$("h3");
  for (const h of h3s) {
    if ((await h.textContent()).trim() === name) { await h.click(); return true; }
  }
  return false;
}

async function clickTrack(page, name) {
  const h3s = await page.$$("h3");
  for (const h of h3s) {
    if ((await h.textContent()).trim() === name) { await h.click(); return true; }
  }
  return false;
}

async function getError(page) {
  return await page.$eval("#error-display", el => {
    const style = el.getAttribute("style") || "";
    return style.includes("display: none") ? null : (el.textContent || "").substring(0, 300);
  }).catch(() => null);
}

async function bodyText(page) {
  return await page.textContent("body").catch(() => "");
}

(async () => {
  console.log("=== VERcel DEPLOYMENT TESTS ===\n");
  const browser = await chromium.launch({ headless: true });
  let passed = 0, failed = 0;

  async function t(name, fn) {
    try { await fn(); passed++; process.stdout.write("."); }
    catch (e) { failed++; console.log("\n❌ " + name + ": " + e.message.substring(0, 200)); }
  }

  // 1. Student login + program selection
  await t("Student login + program", async () => {
    const ctx = await browser.newContext();
    const page = await studentLogin(ctx, "TV" + Date.now());
    if (!page) throw new Error("Login failed");
    const body = await bodyText(page);
    if (!body.includes("Select") && !body.includes("Program")) throw new Error("Program screen not shown: " + body.substring(0, 100));
    await ctx.close();
  });

  // 2. Admin login
  await t("Admin login", async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + "?r=" + Date.now(), { timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await sleep(2000);
    const btns = await page.$$("button");
    for (const b of btns) {
      if ((await b.textContent()).trim() === "Admin") { await b.click(); break; }
    }
    await sleep(500);
    const inputs = await page.$$("input");
    if (inputs.length < 2) throw new Error("Not enough inputs");
    await inputs[0].fill("Ahmed");
    await inputs[1].fill("3320");
    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await sleep(3000);
    const body = await bodyText(page);
    if (!body.includes("Courses") && !body.includes("Prerequisites")) throw new Error("Admin panel not shown: " + body.substring(0, 100));
    await ctx.close();
  });

  // 3. IT program + grades
  await t("IT program + grades", async () => {
    const ctx = await browser.newContext();
    const page = await studentLogin(ctx, "GV" + Date.now());
    if (!page) throw new Error("Login failed");
    if (!await clickProgram(page, "Information Technology")) throw new Error("IT not found");
    await sleep(2000);
    const selects = await page.$$("select");
    let count = 0;
    for (const sel of selects) {
      const opts = await sel.$$("option");
      const vals = await Promise.all(opts.map(o => o.getAttribute("value")));
      if (vals.includes("A")) { await sel.selectOption("A"); count++; if (count >= 3) break; }
    }
    if (count === 0) throw new Error("No grade selectors");
    for (const b of await page.$$("button")) {
      if ((await b.textContent()).includes("Calculate GPA")) { await b.click(); break; }
    }
    await sleep(1000);
    const err = await getError(page);
    if (err) throw new Error("Error: " + err);
    await ctx.close();
  });

  // 4. Print Report
  await t("Print Report button", async () => {
    const ctx = await browser.newContext();
    const page = await studentLogin(ctx, "PV" + Date.now());
    if (!page) throw new Error("Login failed");
    if (!await clickProgram(page, "AI Engineering")) throw new Error("AI Eng not found");
    await sleep(1500);
    const body = await bodyText(page);
    if (!body.includes("Print Report")) throw new Error("Print Report not found");
    await ctx.close();
  });

  // 5. What-If
  await t("What-If Analysis", async () => {
    const ctx = await browser.newContext();
    const page = await studentLogin(ctx, "WV" + Date.now());
    if (!page) throw new Error("Login failed");
    if (!await clickProgram(page, "AI Science")) throw new Error("AI Science not found");
    await sleep(1500);
    const selects = await page.$$("select");
    let count = 0;
    for (const sel of selects) {
      const opts = await sel.$$("option");
      const vals = await Promise.all(opts.map(o => o.getAttribute("value")));
      if (vals.includes("A")) { await sel.selectOption("A"); count++; if (count >= 2) break; }
    }
    await sleep(300);
    for (const b of await page.$$("button")) {
      if ((await b.textContent()).includes("Calculate GPA")) { await b.click(); break; }
    }
    await sleep(300);
    for (const b of await page.$$("button")) {
      if ((await b.textContent()).includes("What-If")) { await b.click(); break; }
    }
    await sleep(500);
    const inputs = await page.$$('input[type="number"]');
    if (inputs.length < 2) throw new Error("What-If inputs not found");
    await inputs[0].fill("9");
    await inputs[1].fill("3.0");
    for (const b of await page.$$("button")) {
      if ((await b.textContent()).includes("Analyze")) { await b.click(); break; }
    }
    await sleep(1000);
    const err = await getError(page);
    if (err) throw new Error("Error: " + err);
    await ctx.close();
  });

  // 6. Data persistence: register → admin sees
  await t("Data persistence (register → admin sees)", async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + "?r=" + Date.now(), { timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await sleep(2000);

    const studentId = "DP" + Date.now();
    const regBtn = await page.$('button:has-text("Register")');
    if (regBtn) await regBtn.click();
    await sleep(300);
    const inputs = await page.$$("input");
    if (inputs.length >= 2) {
      await inputs[0].fill(studentId);
      await inputs[1].fill("test123");
    }
    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await sleep(3000);

    await page.goto(BASE + "?r=" + Date.now(), { timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await sleep(2000);

    const btns = await page.$$("button");
    for (const b of btns) {
      if ((await b.textContent()).trim() === "Admin") { await b.click(); break; }
    }
    await sleep(300);
    const inputs2 = await page.$$("input");
    if (inputs2.length >= 2) {
      await inputs2[0].fill("Ahmed");
      await inputs2[1].fill("3320");
    }
    const submit2 = await page.$('button[type="submit"]');
    if (submit2) await submit2.click();
    await sleep(3000);

    const tabs = await page.$$("button");
    for (const b of tabs) {
      if ((await b.textContent()).trim() === "Students") { await b.click(); break; }
    }
    await sleep(1500);

    const body = await bodyText(page);
    if (!body.includes(studentId)) throw new Error("Student not found in admin. Body: " + body.substring(0, 200));
    await ctx.close();
  });

  console.log();
  console.log("=== RESULTS ===");
  console.log("Passed: " + passed);
  console.log("Failed: " + failed);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
