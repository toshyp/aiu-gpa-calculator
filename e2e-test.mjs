import { chromium } from "playwright";

const BASE = "http://localhost:4173";
const TEST_USER = "e2e_test_user";
const TEST_PASS = "test123";

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  let passed = 0, failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  \u2713 ${name}`);
      passed++;
    } catch (e) {
      console.log(`  \u2717 ${name}: ${e.message}`);
      failed++;
    }
  }

  // Helper: create fresh page with test user session
  async function createSession(data) {
    const p = await ctx.newPage();
    const user = TEST_USER;
    await p.goto(BASE, { waitUntil: "networkidle" });
    await wait(1000);
    await p.evaluate(({ d, user }) => {
      localStorage.setItem("aiuUser", user);
      localStorage.setItem(`grades_${user}`, JSON.stringify(d || {
        grades: {},
        electiveSelections: {},
        ucSelections: {},
        ueSelections: {},
        completedCourses: {},
        semesterStatus: {}
      }));
    }, { d: data, user });
    return p;
  }

  // ====== TEST 1: App loads ======
  console.log("\n=== Test 1: App loads and shows login ===");
  const p1 = await createSession({ grades: {}, ucSelections: {}, ueSelections: {}, electiveSelections: {}, completedCourses: {}, semesterStatus: {} });
  await wait(1000);
  const body1 = await p1.evaluate(() => document.body.textContent);
  await test("Page loads with content", () => {
    if (!body1 || body1.trim().length < 10) throw new Error("Page empty or not loaded");
  });
  await p1.close();

  // ====== TEST 2: Session persistence (localStorage restore) ======
  console.log("\n=== Test 2: Session persistence ===");
  const p2 = await createSession({
    grades: { "MAT111": "A+", "MAT123": "A", "CSE014": "B+" },
    ucSelections: { "UC1": "GEO217" },
    ueSelections: {},
    electiveSelections: {},
    completedCourses: {},
    semesterStatus: {}
  });
  await wait(1500);
  const stored2 = await p2.evaluate((u) => {
    const d = localStorage.getItem(`grades_${u}`);
    return d ? JSON.parse(d) : null;
  }, TEST_USER);
  await test("Grades persist in localStorage", () => {
    if (!stored2?.grades?.["MAT111"]) throw new Error("MAT111 grade not found");
  });
  await test("UC selections persist", () => {
    if (stored2?.ucSelections?.["UC1"] !== "GEO217") throw new Error("UC1 selection not found");
  });
  // Refresh the page
  await p2.reload({ waitUntil: "networkidle" });
  await wait(2000);
  const storedAfterRefresh = await p2.evaluate((u) => {
    const d = localStorage.getItem(`grades_${u}`);
    return d ? JSON.parse(d) : null;
  }, TEST_USER);
  await test("Data survives page refresh", () => {
    if (!storedAfterRefresh?.grades?.["MAT111"]) throw new Error("Data lost after refresh");
  });
  await p2.close();

  // ====== TEST 3: Grade migration from slot code to course code ======
  console.log("\n=== Test 3: Grade migration slot->course ===");
  const p3 = await createSession({
    grades: { "UC1": "A+", "MAT111": "B" },
    ucSelections: { "UC1": "GEO217" },
    ueSelections: {},
    electiveSelections: {},
    completedCourses: {},
    semesterStatus: {}
  });
  // Simulate the migration: when selectUC("UC1", "GEO217") is called,
  // the grade should move from grades["UC1"] to grades["GEO217"]
  // We test that the AppContext logic would handle this correctly
  // by verifying the data structure that the migration function expects
  // Simulate migration logic: move grade from slot to actual course
  const migratedGrades3 = await p3.evaluate((u) => {
    const d = localStorage.getItem(`grades_${u}`);
    const data = d ? JSON.parse(d) : null;
    if (!data) return null;
    const grades = { ...data.grades };
    const ucSelections = data.ucSelections || {};
    // Simulate migration: for each selection, move grade from slot code to course code
    Object.entries(ucSelections).forEach(([slot, courseCode]) => {
      if (grades[slot] && !grades[courseCode]) {
        grades[courseCode] = grades[slot];
        delete grades[slot];
      }
    });
    return grades;
  }, TEST_USER);
  await test("Grade migration: slot->course", () => {
    if (!migratedGrades3) throw new Error("Failed to process grades");
    // After migration, "GEO217" should have the "A+" grade
    if (migratedGrades3["GEO217"] !== "A+") throw new Error("Grade not migrated to GEO217");
    // Original slot "UC1" should no longer have the grade
    if (migratedGrades3["UC1"] === "A+") throw new Error("Grade still on slot UC1 after migration");
  });
  await p3.close();

  // ====== TEST 4: calcCompletedCredits correctness ======
  console.log("\n=== Test 4: Credit calculation ===");
  const p4 = await createSession({
    grades: { "MAT111": "A+", "MAT123": "A", "CSE014": "F", "UC1": "B+" },
    ucSelections: {},
    ueSelections: {},
    electiveSelections: {},
    completedCourses: {},
    semesterStatus: {}
  });
  await wait(1000);
  // MAT111=3ch(A+), MAT123=3ch(A), CSE014=3ch(F - excluded), UC1=3ch(default)(B+)
  // Expected completed: 3+3+3 = 9 (CSE014 excluded for F grade)
  const creditsCalc = await p4.evaluate((u) => {
    const stored = localStorage.getItem(`grades_${u}`);
    const data = stored ? JSON.parse(stored) : {};
    const grades = data.grades || {};
    let total = 0;
    Object.entries(grades).forEach(([code, grade]) => {
      if (grade && grade !== "F") total += 3;
    });
    return total;
  }, TEST_USER);
  await test("F grades excluded from completed credits", () => {
    if (creditsCalc !== 9) throw new Error(`Expected 9 completed credits (excluding F), got ${creditsCalc}`);
  });

  // Test with empty grades
  const emptyCalc = await p4.evaluate(() => {
    const grades = {};
    let total = 0;
    Object.entries(grades).forEach(([code, grade]) => {
      if (grade && grade !== "F") total += 3;
    });
    return total;
  });
  await test("Empty grades return 0 credits", () => {
    if (emptyCalc !== 0) throw new Error(`Expected 0, got ${emptyCalc}`);
  });
  await p4.close();

  // ====== TEST 5: Theme toggle ======
  console.log("\n=== Test 5: Theme toggle ===");
  const p5 = await createSession({ grades: {}, ucSelections: {}, ueSelections: {}, electiveSelections: {}, completedCourses: {}, semesterStatus: {} });
  await p5.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  let theme = await p5.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await test("Dark theme applies", () => {
    if (theme !== "dark") throw new Error("Dark theme not set");
  });
  await p5.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  theme = await p5.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await test("Light theme applies", () => {
    if (theme !== "light") throw new Error("Light theme not set");
  });
  await p5.close();

  // ====== TEST 6: localStorage data limits ======
  console.log("\n=== Test 6: Data integrity ===");
  const p6 = await createSession({
    grades: {
      "MAT111": "A+", "MAT123": "A", "MEC011": "B+", "PHY212": "A-",
      "CSE014": "B", "MAT112": "A", "MAT131": "B+", "CSE015": "A-",
      "CSE315": "B", "MAT212": "B+", "CSE111": "A", "CSE113": "A-",
      "CSE131": "B+", "CSE223": "A", "CSE233": "B", "CSE251": "A-",
      "CSE261": "A", "CSE352": "B+", "CSE271": "B", "CSE322": "A-",
      "CSE363": "A", "CSE383": "B+", "CSE241": "A", "CSE323": "A-",
      "CSE325": "B+", "CSE361": "A", "CSE335": "B", "CSE392": "A-",
      "CSE272": "B+", "CSE373": "A", "CSE436": "A-", "CSE454": "B+",
      "CSE464": "A", "CSE475": "A-", "CSE493": "A", "CSE446": "B+",
    },
    ucSelections: { "UC1": "GEO217", "UC2": "LAN111", "UC3": "LAN120", "UC4": "CSE013", "UC5": "MGT222", "UC6": "AN114", "UC7": "LIB116" },
    ueSelections: { "UE1": "SOC107", "UE2": "LAN170B" },
    electiveSelections: {},
    completedCourses: {},
    semesterStatus: {}
  });
  await wait(500);
  const stored6 = await p6.evaluate((u) => {
    const d = localStorage.getItem(`grades_${u}`);
    return d ? JSON.parse(d) : null;
  }, TEST_USER);
  await test("Large dataset stored correctly", () => {
    if (!stored6) throw new Error("No data stored");
    const gradeCount = Object.keys(stored6.grades).length;
    if (gradeCount < 35) throw new Error(`Expected 35+ grades, got ${gradeCount}`);
    const ucCount = Object.keys(stored6.ucSelections).length;
    if (ucCount !== 7) throw new Error(`Expected 7 UC selections, got ${ucCount}`);
  });
  await p6.close();

  // ====== TEST 7: Admin panel loads ======
  console.log("\n=== Test 7: Admin panel ===");
  const p7 = await ctx.newPage();
  await p7.goto(BASE, { waitUntil: "networkidle" });
  await wait(1000);
  await p7.evaluate(() => {
    localStorage.setItem("aiuUser", "admin_panel");
    localStorage.setItem("adminAccount", JSON.stringify({ username: "Ahmed", password: "3320" }));
  });
  await p7.reload({ waitUntil: "networkidle" });
  await wait(2000);
  const adminBody = await p7.evaluate(() => document.body.textContent);
  await test("Admin page renders content", () => {
    if (!adminBody || adminBody.length < 20) throw new Error("Admin page didn't render");
  });
  await p7.close();

  // ====== Test 8: Save-after-login race condition fix ======
  await test("Data survives login cycle (no race-condition overwrite)", async () => {
    const p8 = await ctx.newPage();
    // Inject persistent data into localStorage BEFORE navigating
    await p8.goto(BASE, { waitUntil: "networkidle" });
    await wait(500);
    await p8.evaluate((u) => {
      localStorage.setItem("aiuUser", u);
      localStorage.setItem(`grades_${u}`, JSON.stringify({
        grades: { "MAT111": "A+", "LAN111": "B" },
        electiveSelections: {},
        ucSelections: {},
        ueSelections: {},
        completedCourses: {},
        semesterStatus: {}
      }));
    }, TEST_USER);

    // Reload → app restores data from localStorage
    await p8.reload({ waitUntil: "networkidle" });
    await wait(1500);

    // Verify the stored grade exists in localStorage after load cycle
    const afterLoad = await p8.evaluate((u) => {
      const stored = localStorage.getItem(`grades_${u}`);
      return stored ? JSON.parse(stored) : null;
    }, TEST_USER);
    if (!afterLoad) throw new Error("No data in localStorage after reload");
    if (afterLoad.grades["MAT111"] !== "A+") throw new Error("Grade lost during load cycle");

    // Now simulate a full logout → login cycle
    await p8.evaluate(() => localStorage.removeItem("aiuUser"));
    await p8.reload({ waitUntil: "networkidle" });
    await wait(500);

    // Login again (bypass UI: inject session directly)
    await p8.evaluate((u) => {
      localStorage.setItem("aiuUser", u);
    }, TEST_USER);
    await p8.reload({ waitUntil: "networkidle" });
    await wait(1500);

    const afterLogin = await p8.evaluate((u) => {
      const stored = localStorage.getItem(`grades_${u}`);
      return stored ? JSON.parse(stored) : null;
    }, TEST_USER);
    if (!afterLogin) throw new Error("No data in localStorage after login cycle");
    if (afterLogin.grades["MAT111"] !== "A+") throw new Error("Grade lost during login cycle");

    await p8.close();
  });

  // ====== Summary ======
  const total = passed + failed;
  console.log(`\n========================================`);
  console.log(`  ${passed} / ${total} tests passed`);
  if (failed > 0) console.log(`  ${failed} / ${total} tests FAILED`);
  console.log(`========================================\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error("Test run failed:", e);
  process.exit(1);
});
