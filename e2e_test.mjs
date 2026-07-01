import { chromium } from "playwright";

const BASE = "http://localhost:5173";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function studentLogin(context, id) {
  const page = await context.newPage();
  page.on("pageerror", () => {}); // swallow
  await page.goto(BASE + "?r=" + Date.now(), { timeout: 20000 });
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(BASE + "?r=" + Date.now(), { timeout: 20000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
  await sleep(1500);

  const input = await page.$('input[type="text"]');
  if (!input) { await page.close(); return null; }
  await input.fill(id);
  const submit = await page.$('button[type="submit"]');
  if (!submit) { await page.close(); return null; }
  await submit.click();
  await sleep(1500);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
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

async function run() {
  const browser = await chromium.launch({ headless: true });
  const passed = [], failed = [];

  async function t(name, fn) {
    try { await fn(); passed.push(name); process.stdout.write("."); }
    catch (e) { failed.push({ name, msg: e.message.substring(0, 300) }); process.stdout.write("x"); }
  }

  console.log("🧪 E2E TESTS (isolated contexts)\n");

  // ====== 1. LOGIN ======
  console.log("1. LOGIN");
  await t("Student login", async () => {
    const ctx = await browser.newContext();
    const page = await studentLogin(ctx, "TEST001");
    if (!page) throw new Error("Login page not loadable");
    const err = await getError(page);
    if (err) throw new Error("Error: " + err);
    const body = await bodyText(page);
    if (!body.includes("Select") && !body.includes("Program")) throw new Error("Program screen not shown");
    await ctx.close();
  });

  // ====== 2. ALL PROGRAMS (click through) ======
  console.log("\n2. ALL PROGRAMS");
  const allProgs = [
    ["Computer Engineering", true],
    ["AI Engineering", false],
    ["Computer Science", true],
    ["AI Science", false],
    ["Biomedical Informatics", false],
    ["Information Technology", false],
  ];

  for (const [name, hasTracks] of allProgs) {
    await t(name, async () => {
      const ctx = await browser.newContext();
      const page = await studentLogin(ctx, "P" + name.replace(/\s/g, ""));
      if (!page) throw new Error("Login failed");
      if (!await clickProgram(page, name)) throw new Error("Program card not found");
      await sleep(1500);
      const err = await getError(page);
      if (err) throw new Error("Error: " + err);
      const body = await bodyText(page);
      if (hasTracks) {
        if (!body.includes("Select") && !body.includes("Track")) throw new Error("Track selection not shown");
      } else {
        if (!body.includes("CH") && !body.includes("Semester")) throw new Error("Dashboard not shown");
      }
      await ctx.close();
    });
  }

  // ====== 3. ALL TRACKS ======
  console.log("\n3. ALL TRACKS");
  const trackMap = [
    ["Computer Engineering", ["Embedded Systems", "Cloud Computing", "High Performance Computing", "Cyber Security"]],
    ["Computer Science", ["Big Data Analytics", "Computer Vision", "Software Engineering"]],
  ];

  for (const [progName, tracks] of trackMap) {
    for (const track of tracks) {
      await t(`${progName} → ${track}`, async () => {
        const ctx = await browser.newContext();
        const page = await studentLogin(ctx, "T" + progName.replace(/\s/g, "") + track.replace(/\s/g, ""));
        if (!page) throw new Error("Login failed");
        if (!await clickProgram(page, progName)) throw new Error("Program not found: " + progName);
        await sleep(1000);
        if (!await clickTrack(page, track)) throw new Error("Track not found: " + track);
        await sleep(1500);
        const err = await getError(page);
        if (err) throw new Error("Error: " + err);
        const body = await bodyText(page);
        if (!body.includes("CH") && !body.includes("Semester")) throw new Error("Dashboard not shown");
        await ctx.close();
      });
    }
  }

  // ====== 4. ADMIN PANEL ======
  console.log("\n4. ADMIN PANEL");
  await t("Admin login", async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + "?r=" + Date.now(), { timeout: 20000 });
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await sleep(1500);

    // Click Admin toggle
    const btns = await page.$$("button");
    for (const b of btns) {
      if ((await b.textContent()).trim() === "Admin") { await b.click(); break; }
    }
    await sleep(500);

    // Fill credentials
    const inputs = await page.$$("input");
    if (inputs.length < 2) throw new Error("Not enough inputs for admin login");
    await inputs[0].fill("Ahmed");
    await inputs[1].fill("3320");

    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await sleep(2000);
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await sleep(1000);

    const err = await getError(page);
    if (err) throw new Error("Error: " + err);
    const body = await bodyText(page);
    if (!body.includes("Courses") && !body.includes("Prerequisites")) throw new Error("Admin panel not shown");
    await ctx.close();
  });

  const tabs = ["Courses", "Prerequisites", "Pools", "Programs", "Account"];
  for (const tab of tabs) {
    await t(`  Tab: ${tab}`, async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(BASE + "?r=" + Date.now(), { timeout: 20000 });
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await sleep(1500);

      const btns = await page.$$("button");
      for (const b of btns) {
        if ((await b.textContent()).trim() === "Admin") { await b.click(); break; }
      }
      await sleep(300);
      const inputs = await page.$$("input");
      if (inputs.length >= 2) {
        await inputs[0].fill("Ahmed");
        await inputs[1].fill("3320");
      }
      const submit = await page.$('button[type="submit"]');
      if (submit) await submit.click();
      await sleep(1500);

      for (const b of await page.$$("button")) {
        if ((await b.textContent()).trim() === tab) { await b.click(); break; }
      }
      await sleep(500);
      const err = await getError(page);
      if (err) throw new Error("Tab error: " + err);
      await ctx.close();
    });
  }

  // ====== 5. GRADES & WHAT-IF ======
  console.log("\n5. GRADES & WHAT-IF");
  await t("Enter grades & Calculate", async () => {
    const ctx = await browser.newContext();
    const page = await studentLogin(ctx, "GRADE01");
    if (!page) throw new Error("Login failed");

    if (!await clickProgram(page, "Information Technology")) throw new Error("IT not found");
    await sleep(1500);

    // Set grades
    const selects = await page.$$("select");
    let count = 0;
    for (const sel of selects) {
      const opts = await sel.$$("option");
      const vals = await Promise.all(opts.map(o => o.getAttribute("value")));
      if (vals.includes("A")) { await sel.selectOption("A"); count++; if (count >= 3) break; }
    }
    if (count === 0) throw new Error("No grade selectors found");

    // Calculate
    for (const b of await page.$$("button")) {
      if ((await b.textContent()).includes("Calculate GPA")) { await b.click(); break; }
    }
    await sleep(800);
    const err = await getError(page);
    if (err) throw new Error("Error: " + err);
    await ctx.close();
  });

  await t("What-If Analysis", async () => {
    const ctx = await browser.newContext();
    const page = await studentLogin(ctx, "WHAT01");
    if (!page) throw new Error("Login failed");

    if (!await clickProgram(page, "AI Science")) throw new Error("AI Science not found");
    await sleep(1500);

    // Set some grades
    const selects = await page.$$("select");
    let count = 0;
    for (const sel of selects) {
      const opts = await sel.$$("option");
      const vals = await Promise.all(opts.map(o => o.getAttribute("value")));
      if (vals.includes("A")) { await sel.selectOption("A"); count++; if (count >= 2) break; }
    }
    await sleep(300);

    // Calculate GPA
    for (const b of await page.$$("button")) {
      if ((await b.textContent()).includes("Calculate GPA")) { await b.click(); break; }
    }
    await sleep(300);

    // Open What-If
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
    await sleep(800);
    const err = await getError(page);
    if (err) throw new Error("Error: " + err);
    await ctx.close();
  });

  // ====== SUMMARY ======
  console.log(`\n\n${"=".repeat(50)}`);
  console.log(`RESULTS: ${passed.length + failed.length} tests`);
  console.log(`  ✅ PASSED: ${passed.length}`);
  console.log(`  ❌ FAILED: ${failed.length}`);
  if (failed.length > 0) {
    console.log(`\n❌ FAILURES:`);
    for (const f of failed) console.log(`  ${f.name}: ${f.msg}`);
  }

  await browser.close();
}

run();
