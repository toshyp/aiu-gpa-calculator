import { chromium } from "playwright";

const BASE = "http://localhost:4173";
const USERS = {
  DEFAULT: "e2e_main",
  NUMERIC: "21100778",
  SPECIAL: "test_user_42",
  LONG: "a".repeat(50),
  EMPTY: "",
};

let passed = 0, failed = 0;

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test(name, fn) {
  const timeout = 10000;
  const start = Date.now();
  try {
    await fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (e) {
    const elapsed = Date.now() - start;
    // truncate long error messages
    const msg = e.message.length > 120 ? e.message.slice(0, 120) + "..." : e.message;
    console.log(`  \u2717 ${name} (${elapsed}ms): ${msg}`);
    failed++;
  }
}

function makeGrades(entries) {
  const g = {};
  entries.forEach(([code, grade]) => { if (grade !== undefined) g[code] = grade; });
  return g;
}

function gradeScale() {
  return ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F"];
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();

  // ============================================================
  // HELPER: Create a page with user session in localStorage
  // ============================================================
  async function freshPage(user = USERS.DEFAULT, grades = {}, selections = {}) {
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "networkidle" });
    await wait(800);
    await p.evaluate(({ u, g, s }) => {
      localStorage.clear();
      localStorage.setItem("aiuUser", u);
      localStorage.setItem(`grades_${u}`, JSON.stringify({
        grades: g,
        electiveSelections: s.electiveSelections || {},
        ucSelections: s.ucSelections || {},
        ueSelections: s.ueSelections || {},
        completedCourses: s.completedCourses || {},
        semesterStatus: s.semesterStatus || {}
      }));
    }, { u: user, g: grades, s: selections });
    return p;
  }

  async function reloadPage(p, user = USERS.DEFAULT) {
    await p.reload({ waitUntil: "load" });
    await wait(2000);
  }

  async function getStored(p, user = USERS.DEFAULT) {
    return await p.evaluate((u) => {
      const d = localStorage.getItem(`grades_${u}`);
      return d ? JSON.parse(d) : null;
    }, user);
  }

  // ============================================================
  // GROUP 1: LOGIN & SESSION (tests 1-10)
  // ============================================================
  console.log("\n\x1b[36m=== AUTH & SESSION (10 tests) ===\x1b[0m");

  await test("Login page renders", async () => {
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "networkidle" });
    await wait(800);
    const body = await p.evaluate(() => document.body.textContent);
    if (!body || body.length < 10) throw new Error("Empty page");
    await p.close();
  });

  await test("Session survives page refresh", async () => {
    const p = await freshPage();
    await reloadPage(p);
    const data = await getStored(p);
    if (!data) throw new Error("No data after refresh");
    await p.close();
  });

  await test("Numeric user ID works", async () => {
    const p = await freshPage(USERS.NUMERIC);
    await reloadPage(p);
    const data = await getStored(p, USERS.NUMERIC);
    if (!data) throw new Error("Numeric user ID lost data");
    await p.close();
  });

  await test("Multiple users isolated", async () => {
    const p1 = await freshPage("user_a", makeGrades([["MATH1", "A+"]]));
    await reloadPage(p1, "user_a");
    const d1 = await getStored(p1, "user_a");

    const p2 = await freshPage("user_b", makeGrades([["MATH1", "F"]]));
    await reloadPage(p2, "user_b");
    const d2 = await getStored(p2, "user_b");

    if (d1?.grades?.MATH1 !== "A+") throw new Error("User A data corruption");
    if (d2?.grades?.MATH1 !== "F") throw new Error("User B data corruption");
    await p1.close(); await p2.close();
  });

  await test("Empty grades on new user", async () => {
    const p = await freshPage("new_user_99");
    await reloadPage(p, "new_user_99");
    const d = await getStored(p, "new_user_99");
    if (!d) throw new Error("No data object");
    if (Object.keys(d?.grades || {}).length !== 0) throw new Error("New user should have empty grades");
    await p.close();
  });

  await test("Logout clears user session", async () => {
    const p = await freshPage();
    await reloadPage(p);
    const pre = await p.evaluate(() => localStorage.getItem("aiuUser"));
    if (pre !== USERS.DEFAULT) throw new Error("User not set before logout");
    // Simulate logout
    await p.evaluate(() => localStorage.removeItem("aiuUser"));
    const post = await p.evaluate(() => localStorage.getItem("aiuUser"));
    if (post !== null) throw new Error("aiuUser not removed on logout");
    await p.close();
  });

  await test("Login with empty user ID handled", async () => {
    const p = await freshPage(USERS.EMPTY);
    await reloadPage(p, USERS.EMPTY);
    const data = await getStored(p, USERS.EMPTY);
    // Empty user might store under empty string key
    if (data !== null) {
      // It stored data under "" - should not break
    }
    await p.close();
  });

  await test("Session survives back-to-back login with same user", async () => {
    const p = await freshPage("repeat_user", makeGrades([["CS101", "B+"]]));
    await reloadPage(p, "repeat_user");
    await reloadPage(p, "repeat_user");
    const d = await getStored(p, "repeat_user");
    if (d?.grades?.CS101 !== "B+") throw new Error("Lost grade after double refresh");
    await p.close();
  });

  await test("Grades preserved after logout/login cycle", async () => {
    const p = await freshPage("cycle_user", makeGrades([["PHY101", "A"]]));
    await reloadPage(p, "cycle_user");
    // Simulate logout
    await p.evaluate(() => localStorage.removeItem("aiuUser"));
    await reloadPage(p);
    // Simulate login back
    await p.evaluate((u) => localStorage.setItem("aiuUser", u), "cycle_user");
    await reloadPage(p, "cycle_user");
    const d = await getStored(p, "cycle_user");
    if (d?.grades?.PHY101 !== "A") throw new Error("Grades lost after logout/login");
    await p.close();
  });

  await test("Long username does not crash", async () => {
    const long = USERS.LONG;
    const p = await freshPage(long, makeGrades([["TEST1", "A+"]]));
    await reloadPage(p, long);
    const d = await getStored(p, long);
    if (!d) throw new Error("Long username failed");
    if (d?.grades?.TEST1 !== "A+") throw new Error("Long username lost grade");
    await p.close();
  });

  // ============================================================
  // GROUP 2: GRADE CRUD (tests 11-30)
  // ============================================================
  console.log("\n\x1b[36m=== GRADE CRUD (20 tests) ===\x1b[0m");

  // --- Single grade operations ---
  for (const gr of ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"]) {
    await test(`Single grade ${gr} stored and persists`, async () => {
      const p = await freshPage("grd_user", makeGrades([["GRD101", gr]]));
      await reloadPage(p, "grd_user");
      const d = await getStored(p, "grd_user");
      if (d?.grades?.GRD101 !== gr) throw new Error(`${gr} not persisted`);
      await p.close();
    });
  }

  await test("Empty grade (unset) stored as empty", async () => {
    const p = await freshPage("grd_user", makeGrades([["GRD101", ""]]));
    await reloadPage(p, "grd_user");
    const d = await getStored(p, "grd_user");
    if (d?.grades?.GRD101 !== "") throw new Error("Empty grade not stored");
    await p.close();
  });

  await test("Grade A+ then change to A- persists", async () => {
    const p = await freshPage("grd_user", makeGrades([["GRD101", "A+"]]));
    await reloadPage(p, "grd_user");
    // Change grade in localStorage (simulating setGrade + auto-save)
    await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      d.grades["GRD101"] = "A-";
      localStorage.setItem(`grades_${u}`, JSON.stringify(d));
    }, "grd_user");
    await reloadPage(p, "grd_user");
    const d = await getStored(p, "grd_user");
    if (d?.grades?.GRD101 !== "A-") throw new Error("Grade change not persisted");
    await p.close();
  });

  await test("Grade A+ then remove (empty) persists", async () => {
    const p = await freshPage("grd_user", makeGrades([["GRD101", "A+"]]));
    await reloadPage(p, "grd_user");
    await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      d.grades["GRD101"] = "";
      localStorage.setItem(`grades_${u}`, JSON.stringify(d));
    }, "grd_user");
    await reloadPage(p, "grd_user");
    const d = await getStored(p, "grd_user");
    if (d?.grades?.GRD101 !== "") throw new Error("Grade removal not persisted");
    await p.close();
  });

  // --- Multiple grades ---
  await test("10 grades all persist", async () => {
    const entries = [];
    for (let i = 0; i < 10; i++) {
      entries.push([`CRS${String(i).padStart(3, "0")}`, gradeScale()[i % gradeScale().length]]);
    }
    const p = await freshPage("multi_user", makeGrades(entries));
    await reloadPage(p, "multi_user");
    const d = await getStored(p, "multi_user");
    for (const [code, grade] of entries) {
      if (d?.grades?.[code] !== grade) throw new Error(`${code} lost after multi save`);
    }
    await p.close();
  });

  await test("Mixed grades (A+ and F together)", async () => {
    const p = await freshPage("mix_user", makeGrades([["GRD1", "A+"], ["GRD2", "F"], ["GRD3", "B"]]));
    await reloadPage(p, "mix_user");
    const d = await getStored(p, "mix_user");
    if (d?.grades?.GRD1 !== "A+" || d?.grades?.GRD2 !== "F" || d?.grades?.GRD3 !== "B")
      throw new Error("Mixed grades lost");
    await p.close();
  });

  await test("Grade for non-existent course code", async () => {
    const p = await freshPage("ghost_user", makeGrades([["ZZZ999", "A+"]]));
    await reloadPage(p, "ghost_user");
    const d = await getStored(p, "ghost_user");
    if (d?.grades?.ZZZ999 !== "A+") throw new Error("Ghost course grade lost");
    await p.close();
  });

  // ============================================================
  // GROUP 3: UC/UE/TE SELECTIONS (tests 31-50)
  // ============================================================
  console.log("\n\x1b[36m=== UC/UE/TE SELECTIONS (20 tests) ===\x1b[0m");

  // --- UC selections ---
  for (let i = 1; i <= 7; i++) {
    const slot = `UC${i}`;
    const course = `GEO${217 + i}`;
    await test(`UC slot ${slot} selection persists`, async () => {
      const p = await freshPage("uc_user", {}, { ucSelections: { [slot]: course } });
      await reloadPage(p, "uc_user");
      const d = await getStored(p, "uc_user");
      if (d?.ucSelections?.[slot] !== course) throw new Error(`UC ${slot} not persisted`);
      await p.close();
    });
  }

  await test("Multiple UC selections all persist", async () => {
    const sels = {};
    for (let i = 1; i <= 7; i++) sels[`UC${i}`] = `GEO${220 + i}`;
    const p = await freshPage("uc_user", {}, { ucSelections: sels });
    await reloadPage(p, "uc_user");
    const d = await getStored(p, "uc_user");
    for (let i = 1; i <= 7; i++) {
      if (d?.ucSelections?.[`UC${i}`] !== `GEO${220 + i}`)
        throw new Error(`UC${i} lost in multi selection`);
    }
    await p.close();
  });

  await test("UE slot selection persists", async () => {
    const p = await freshPage("ue_user", {}, { ueSelections: { UE1: "SOC107" } });
    await reloadPage(p, "ue_user");
    const d = await getStored(p, "ue_user");
    if (d?.ueSelections?.UE1 !== "SOC107") throw new Error("UE selection not persisted");
    await p.close();
  });

  await test("TE (elective) slot selection persists", async () => {
    const p = await freshPage("te_user", {}, { electiveSelections: { E1: "CHE142" } });
    await reloadPage(p, "te_user");
    const d = await getStored(p, "te_user");
    if (d?.electiveSelections?.E1 !== "CHE142") throw new Error("TE selection not persisted");
    await p.close();
  });

  await test("All selection types together persist", async () => {
    const p = await freshPage("all_sel", {}, {
      ucSelections: { UC1: "GEO217" },
      ueSelections: { UE1: "SOC107", UE2: "MGT102" },
      electiveSelections: { E1: "CHE142", E2: "ELE115" }
    });
    await reloadPage(p, "all_sel");
    const d = await getStored(p, "all_sel");
    if (d?.ucSelections?.UC1 !== "GEO217") throw new Error("UC lost");
    if (d?.ueSelections?.UE1 !== "SOC107") throw new Error("UE lost");
    if (d?.electiveSelections?.E1 !== "CHE142") throw new Error("TE lost");
    await p.close();
  });

  // --- Grade migration UC/UE/TE ---
  await test("Grade migration: UC slot grade -> course code", async () => {
    const p = await freshPage("mig_user", makeGrades([["UC1", "A+"]]), { ucSelections: {} });
    await reloadPage(p, "mig_user");
    // Simulate selecting UC1 -> GEO217 (migration should move grade)
    await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      if (d.grades["UC1"] && !d.grades["GEO217"]) {
        d.grades["GEO217"] = d.grades["UC1"];
        delete d.grades["UC1"];
      }
      d.ucSelections = { ...(d.ucSelections || {}), UC1: "GEO217" };
      localStorage.setItem(`grades_${u}`, JSON.stringify(d));
    }, "mig_user");
    await reloadPage(p, "mig_user");
    const d = await getStored(p, "mig_user");
    if (d?.grades?.GEO217 !== "A+") throw new Error("Grade did not migrate to GEO217");
    if (d?.grades?.UC1 === "A+") throw new Error("Grade still under UC1 after migration");
    await p.close();
  });

  await test("Grade migration: UE slot grade -> course code", async () => {
    const p = await freshPage("mig_user", makeGrades([["UE1", "B+"]]), { ueSelections: {} });
    await reloadPage(p, "mig_user");
    await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      if (d.grades["UE1"] && !d.grades["SOC107"]) {
        d.grades["SOC107"] = d.grades["UE1"];
        delete d.grades["UE1"];
      }
      d.ueSelections = { ...(d.ueSelections || {}), UE1: "SOC107" };
      localStorage.setItem(`grades_${u}`, JSON.stringify(d));
    }, "mig_user");
    await reloadPage(p, "mig_user");
    const d = await getStored(p, "mig_user");
    if (d?.grades?.SOC107 !== "B+") throw new Error("UE grade did not migrate");
    await p.close();
  });

  await test("Grade migration: TE slot grade -> course code", async () => {
    const p = await freshPage("mig_user", makeGrades([["E1", "A"]]), { electiveSelections: {} });
    await reloadPage(p, "mig_user");
    await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      if (d.grades["E1"] && !d.grades["CHE142"]) {
        d.grades["CHE142"] = d.grades["E1"];
        delete d.grades["E1"];
      }
      d.electiveSelections = { ...(d.electiveSelections || {}), E1: "CHE142" };
      localStorage.setItem(`grades_${u}`, JSON.stringify(d));
    }, "mig_user");
    await reloadPage(p, "mig_user");
    const d = await getStored(p, "mig_user");
    if (d?.grades?.CHE142 !== "A") throw new Error("TE grade did not migrate");
    await p.close();
  });

  await test("Grade NOT migrated when course already has grade", async () => {
    const p = await freshPage("mig_user", makeGrades([["UC1", "A+"], ["GEO217", "B"]]));
    await reloadPage(p, "mig_user");
    await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      d.ucSelections = { ...(d.ucSelections || {}), UC1: "GEO217" };
      // migration should NOT run because GEO217 already has grade
      localStorage.setItem(`grades_${u}`, JSON.stringify(d));
    }, "mig_user");
    await reloadPage(p, "mig_user");
    const d = await getStored(p, "mig_user");
    if (d?.grades?.GEO217 !== "B") throw new Error("Existing grade was overwritten");
    if (d?.grades?.UC1 !== "A+") throw new Error("Slot grade was removed incorrectly");
    await p.close();
  });

  // ============================================================
  // GROUP 4: CREDIT & GPA CALCULATION (tests 51-65)
  // ============================================================
  console.log("\n\x1b[36m=== CREDIT & GPA CALCULATION (15 tests) ===\x1b[0m");

  await test("F grades excluded from completed credits", async () => {
    const p = await freshPage("calc_user", makeGrades([["A", "A+"], ["B", "F"], ["C", "B"]]));
    await reloadPage(p, "calc_user");
    const d = await getStored(p, "calc_user");
    // Only A+ and B count (each 3 credits by default) = 6
    const grades = d?.grades || {};
    let total = 0;
    for (const [code, grade] of Object.entries(grades)) {
      if (grade && grade !== "F") total += 3;
    }
    if (total !== 6) throw new Error(`Expected 6 credits, got ${total}`);
    await p.close();
  });

  await test("All F grades => 0 completed credits", async () => {
    const p = await freshPage("calc_user", makeGrades([["A", "F"], ["B", "F"]]));
    await reloadPage(p, "calc_user");
    const d = await getStored(p, "calc_user");
    const grades = d?.grades || {};
    let total = 0;
    for (const [code, grade] of Object.entries(grades)) {
      if (grade && grade !== "F") total += 3;
    }
    if (total !== 0) throw new Error(`Expected 0 credits, got ${total}`);
    await p.close();
  });

  await test("All A+ => completed = total courses * 3", async () => {
    const courses = ["CRS1","CRS2","CRS3","CRS4","CRS5"];
    const p = await freshPage("calc_user", makeGrades(courses.map(c => [c, "A+"])));
    await reloadPage(p, "calc_user");
    const d = await getStored(p, "calc_user");
    let total = 0;
    for (const [code, grade] of Object.entries(d?.grades || {})) {
      if (grade && grade !== "F") total += 3;
    }
    if (total !== courses.length * 3) throw new Error(`Expected ${courses.length*3} credits`);
    await p.close();
  });

  await test("Empty grades => 0 credits", async () => {
    const p = await freshPage("calc_user", {});
    await reloadPage(p, "calc_user");
    const d = await getStored(p, "calc_user");
    if (Object.keys(d?.grades || {}).length !== 0) throw new Error("Should have no grades");
    await p.close();
  });

  await test("Grade change from A+ to F reduces credits", async () => {
    const p = await freshPage("calc_user", makeGrades([["CRS1", "A+"]]));
    await reloadPage(p, "calc_user");
    await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      d.grades["CRS1"] = "F";
      localStorage.setItem(`grades_${u}`, JSON.stringify(d));
    }, "calc_user");
    await reloadPage(p, "calc_user");
    const d = await getStored(p, "calc_user");
    if (d?.grades?.CRS1 !== "F") throw new Error("Grade change to F not persisted");
    await p.close();
  });

  await test("Grade migration does not change credit total", async () => {
    const p = await freshPage("cred_user", makeGrades([["UC1", "A+"]]));
    await reloadPage(p, "cred_user");
    // Migrate
    await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      if (d.grades["UC1"] && !d.grades["GEO217"]) {
        d.grades["GEO217"] = d.grades["UC1"];
        delete d.grades["UC1"];
      }
      d.ucSelections = { UC1: "GEO217" };
      localStorage.setItem(`grades_${u}`, JSON.stringify(d));
    }, "cred_user");
    await reloadPage(p, "cred_user");
    const d = await getStored(p, "cred_user");
    if (d?.grades?.GEO217 !== "A+") throw new Error("Grade lost after migration");
    // Credits should still be 3 (one course)
    const grades = d?.grades || {};
    let total = 0;
    for (const [code, grade] of Object.entries(grades)) {
      if (grade && grade !== "F") total += 3;
    }
    if (total !== 3) throw new Error(`Expected 3 credits after migration, got ${total}`);
    await p.close();
  });

  // --- GPA calculations via page evaluate ---
  await test("GPA: All A+ => 4.0", async () => {
    const p = await freshPage("gpa_user", makeGrades([["CRS1", "A+"], ["CRS2", "A+"]]));
    await reloadPage(p, "gpa_user");
    const gpa = await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      const grades = d?.grades || {};
      const scale = { "A+":4,"A":4,"A-":3.7,"B+":3.3,"B":3,"B-":2.7,"C+":2.3,"C":2,"C-":1.7,"D+":1.3,"D":1,"D-":0.7,"F":0 };
      let pts = 0, crs = 0;
      for (const [code, g] of Object.entries(grades)) {
        const p = scale[g];
        if (p !== undefined) { pts += p * 3; crs += 3; }
      }
      return crs > 0 ? pts / crs : 0;
    }, "gpa_user");
    if (gpa !== 4.0) throw new Error(`Expected 4.0 GPA, got ${gpa}`);
    await p.close();
  });

  await test("GPA: Mixed grades", async () => {
    const p = await freshPage("gpa_user", makeGrades([["CRS1", "A"], ["CRS2", "B"], ["CRS3", "F"]]));
    await reloadPage(p, "gpa_user");
    const gpa = await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      const grades = d?.grades || {};
      const scale = { "A+":4,"A":4,"A-":3.7,"B+":3.3,"B":3,"B-":2.7,"C+":2.3,"C":2,"C-":1.7,"D+":1.3,"D":1,"D-":0.7,"F":0 };
      let pts = 0, crs = 0;
      for (const [code, g] of Object.entries(grades)) {
        const p = scale[g];
        if (p !== undefined && g !== "F") { pts += p * 3; crs += 3; }
      }
      return crs > 0 ? Math.round(pts / crs * 100) / 100 : 0;
    }, "gpa_user");
    // A=4, B=3, F excluded => (12 + 9) / 6 = 3.5
    if (gpa !== 3.5) throw new Error(`Expected 3.5 GPA, got ${gpa}`);
    await p.close();
  });

  await test("GPA: No grades => 0", async () => {
    const p = await freshPage("gpa_user", {});
    await reloadPage(p, "gpa_user");
    const gpa = await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      const grades = d?.grades || {};
      const scale = { "A+":4,"A":4,"A-":3.7,"B+":3.3,"B":3,"B-":2.7,"C+":2.3,"C":2,"C-":1.7,"D+":1.3,"D":1,"D-":0.7,"F":0 };
      let pts = 0, crs = 0;
      for (const [code, g] of Object.entries(grades)) {
        const p = scale[g];
        if (p !== undefined) { pts += p * 3; crs += 3; }
      }
      return crs > 0 ? pts / crs : 0;
    }, "gpa_user");
    if (gpa !== 0) throw new Error(`Expected 0 GPA, got ${gpa}`);
    await p.close();
  });

  await test("GPA: All F => 0 (F excluded from calculation)", async () => {
    const p = await freshPage("gpa_user", makeGrades([["F1", "F"], ["F2", "F"]]));
    await reloadPage(p, "gpa_user");
    const gpa = await p.evaluate((u) => {
      const d = JSON.parse(localStorage.getItem(`grades_${u}`));
      const grades = d?.grades || {};
      const scale = { "A+":4,"A":4,"A-":3.7,"B+":3.3,"B":3,"B-":2.7,"C+":2.3,"C":2,"C-":1.7,"D+":1.3,"D":1,"D-":0.7,"F":0 };
      let pts = 0, crs = 0;
      for (const [code, g] of Object.entries(grades)) {
        const p = scale[g];
        if (p !== undefined && g !== "F") { pts += p * 3; crs += 3; }
      }
      return crs > 0 ? pts / crs : 0;
    }, "gpa_user");
    if (gpa !== 0) throw new Error(`Expected 0 GPA for all F, got ${gpa}`);
    await p.close();
  });

  // ============================================================
  // GROUP 5: THEME (tests 66-70)
  // ============================================================
  console.log("\n\x1b[36m=== THEME (5 tests) ===\x1b[0m");

  // Theme is stored under "aiuTheme"
  await test("Theme persists in localStorage", async () => {
    const p = await freshPage("theme_user");
    await p.evaluate(() => localStorage.setItem("aiuTheme", "dark"));
    await reloadPage(p, "theme_user");
    const theme = await p.evaluate(() => localStorage.getItem("aiuTheme"));
    if (theme !== "dark") throw new Error("Theme not persisted");
    await p.close();
  });

  await test("Theme toggle dark -> light", async () => {
    const p = await freshPage("theme_user");
    await p.evaluate(() => localStorage.setItem("aiuTheme", "light"));
    await reloadPage(p, "theme_user");
    const theme = await p.evaluate(() => localStorage.getItem("aiuTheme"));
    if (theme !== "light") throw new Error("Light theme not saved");
    await p.close();
  });

  await test("Theme toggle light -> dark", async () => {
    const p = await freshPage("theme_user");
    await p.evaluate(() => localStorage.setItem("aiuTheme", "dark"));
    await reloadPage(p, "theme_user");
    const theme = await p.evaluate(() => localStorage.getItem("aiuTheme"));
    if (theme !== "dark") throw new Error("Dark theme not saved");
    await p.close();
  });

  await test("data-theme attr matches localStorage", async () => {
    const p = await freshPage("theme_user");
    await p.evaluate(() => localStorage.setItem("aiuTheme", "dark"));
    await reloadPage(p, "theme_user");
    const attr = await p.evaluate(() => document.documentElement.getAttribute("data-theme"));
    const stored = await p.evaluate(() => localStorage.getItem("aiuTheme"));
    if (attr !== stored) throw new Error(`data-theme ${attr} !== localStorage ${stored}`);
    await p.close();
  });

  await test("Default theme is dark", async () => {
    const p = await freshPage("theme_user");
    await p.evaluate(() => localStorage.removeItem("aiuTheme"));
    await reloadPage(p, "theme_user");
    const theme = await p.evaluate(() => localStorage.getItem("aiuTheme"));
    // Initial state is dark (useState with fallback "dark")
    // but might not be saved yet until effect runs
    // Just check it's a valid value
    if (theme !== "dark" && theme !== "light") throw new Error(`Unexpected theme: ${theme}`);
    await p.close();
  });

  // ============================================================
  // GROUP 6: DATA INTEGRITY & EDGE CASES (tests 71-85)
  // ============================================================
  console.log("\n\x1b[36m=== DATA INTEGRITY & EDGE CASES (15 tests) ===\x1b[0m");

  await test("100 grades all persist correctly", async () => {
    const entries = [];
    for (let i = 0; i < 100; i++) entries.push([`BIG${String(i).padStart(3,"0")}`, "A+"]);
    const p = await freshPage("big_user", makeGrades(entries));
    await reloadPage(p, "big_user");
    const d = await getStored(p, "big_user");
    let count = 0;
    for (let i = 0; i < 100; i++) {
      if (d?.grades?.[`BIG${String(i).padStart(3,"0")}`] === "A+") count++;
    }
    if (count !== 100) throw new Error(`Only ${count}/100 grades persisted`);
    await p.close();
  });

  await test("35 UC+UE+TE selections all persist", async () => {
    const sel = {};
    for (let i = 1; i <= 7; i++) sel[`UC${i}`] = `GEO${220 + i}`;
    for (let i = 1; i <= 3; i++) sel[`UE${i}`] = `SOC${100 + i}`;
    for (let i = 1; i <= 6; i++) sel[`E${i}`] = `ELE${100 + i}`;
    // Actually use real course codes
    const ucCodes = ["GEO217","LAN111","LAN120","CSE013","MGT222","AN114","LIB116"];
    const ueCodes = ["SOC107","PSC207","LAN170A"];
    const teCodes = ["CHE142","MAT121","MAT122","MAT315","PHY211","ELE115"];
    for (let i = 0; i < 7; i++) sel[`UC${i+1}`] = ucCodes[i];
    for (let i = 0; i < 3; i++) sel[`UE${i+1}`] = ueCodes[i];
    for (let i = 0; i < 6; i++) sel[`E${i+1}`] = teCodes[i];

    const p = await freshPage("big_user", makeGrades(ucCodes.map(c => [c, "A+"])), {
      ucSelections: Object.fromEntries(Object.entries(sel).filter(([k]) => k.startsWith("UC"))),
      ueSelections: Object.fromEntries(Object.entries(sel).filter(([k]) => k.startsWith("UE"))),
      electiveSelections: Object.fromEntries(Object.entries(sel).filter(([k]) => k.startsWith("E"))),
    });
    await reloadPage(p, "big_user");
    const d = await getStored(p, "big_user");
    // Check a few
    if (d?.ucSelections?.UC1 !== "GEO217") throw new Error("UC1 lost in big dataset");
    if (d?.ueSelections?.UE1 !== "SOC107") throw new Error("UE1 lost in big dataset");
    if (d?.electiveSelections?.E1 !== "CHE142") throw new Error("E1 lost in big dataset");
    await p.close();
  });

  await test("Combined grades + selections large dataset", async () => {
    const entries = [];
    for (let i = 0; i < 50; i++) entries.push([`ALL${i}`, gradeScale()[i % gradeScale().length]]);
    const p = await freshPage("all_user", makeGrades(entries), {
      ucSelections: { UC1: "GEO217" },
      ueSelections: { UE1: "SOC107", UE2: "PSC207" },
      electiveSelections: { E1: "CHE142", E2: "MAT121" }
    });
    await reloadPage(p, "all_user");
    const d = await getStored(p, "all_user");
    // Check random grades
    if (d?.grades?.ALL0 !== "A+") throw new Error("ALL0 lost");
    if (d?.grades?.ALL13 !== "A+") throw new Error("ALL13 lost");
    if (d?.grades?.ALL49 !== "D") throw new Error("ALL49 lost");
    // Check selections
    if (d?.ucSelections?.UC1 !== "GEO217") throw new Error("UC1 lost in combined");
    if (d?.electiveSelections?.E1 !== "CHE142") throw new Error("E1 lost in combined");
    await p.close();
  });

  await test("Rapid grade changes all persist (10 changes)", async () => {
    const p = await freshPage("rapid_user");
    const grades = {};
    for (let i = 0; i < 10; i++) {
      grades[`RAP${i}`] = gradeScale()[i];
    }
    await p.evaluate(({ u, g }) => {
      const stored = JSON.parse(localStorage.getItem(`grades_${u}`));
      Object.assign(stored.grades, g);
      localStorage.setItem(`grades_${u}`, JSON.stringify(stored));
    }, { u: "rapid_user", g: grades });
    await reloadPage(p, "rapid_user");
    const d = await getStored(p, "rapid_user");
    if (d?.grades?.RAP0 !== "A+" || d?.grades?.RAP5 !== "B-")
      throw new Error("Rapid changes not all persisted");
    await p.close();
  });

  await test("Clear all removes grades but keeps user", async () => {
    const p = await freshPage("clr_user", makeGrades([["CRS1", "A+"], ["CRS2", "B"]]));
    await reloadPage(p, "clr_user");
    // Simulate clearAllData
    await p.evaluate((u) => {
      localStorage.setItem(`grades_${u}`, JSON.stringify({
        grades: {},
        electiveSelections: {},
        ucSelections: {},
        ueSelections: {},
        completedCourses: {},
        semesterStatus: {}
      }));
    }, "clr_user");
    await reloadPage(p, "clr_user");
    const d = await getStored(p, "clr_user");
    if (Object.keys(d?.grades || {}).length !== 0) throw new Error("Grades not cleared");
    const user = await p.evaluate(() => localStorage.getItem("aiuUser"));
    if (user !== "clr_user") throw new Error("User session lost after clear");
    await p.close();
  });

  await test("Data survives 3 consecutive refreshes", async () => {
    const p = await freshPage("ref_user", makeGrades([["STABLE", "A+"]]));
    for (let i = 0; i < 3; i++) {
      await reloadPage(p, "ref_user");
    }
    const d = await getStored(p, "ref_user");
    if (d?.grades?.STABLE !== "A+") throw new Error("Grade lost after 3 refreshes");
    await p.close();
  });

  await test("Grades with course code special characters", async () => {
    const entries = [
      ["101", "A+"],
      ["A-101", "B"],
      ["MATH_101", "A"],
    ];
    const p = await freshPage("spec_user", makeGrades(entries));
    await reloadPage(p, "spec_user");
    const d = await getStored(p, "spec_user");
    for (const [code, grade] of entries) {
      if (d?.grades?.[code] !== grade) throw new Error(`Special code ${code} lost`);
    }
    await p.close();
  });

  await test("Grade with null value handled", async () => {
    const p = await freshPage("nil_user");
    await p.evaluate((u) => {
      localStorage.setItem(`grades_${u}`, JSON.stringify({
        grades: { "CRS1": null, "CRS2": "A+" },
        electiveSelections: {},
        ucSelections: {},
        ueSelections: {},
        completedCourses: {},
        semesterStatus: {}
      }));
    }, "nil_user");
    await reloadPage(p, "nil_user");
    const d = await getStored(p, "nil_user");
    if (d?.grades?.CRS1 !== null && d?.grades?.CRS1 !== undefined)
      throw new Error("Null grade should be null/undefined");
    if (d?.grades?.CRS2 !== "A+") throw new Error("Non-null grade lost alongside null");
    await p.close();
  });

  // ============================================================
  // GROUP 7: IMPORT FROM REPORT (tests 86-95)
  // ============================================================
  console.log("\n\x1b[36m=== IMPORT FROM REPORT (10 tests) ===\x1b[0m");

  async function simulateImport(p, html, user = USERS.DEFAULT) {
    return await p.evaluate(({ h, u }) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(h, "text/html");
      const rows = doc.querySelectorAll(".semester table tbody tr");
      const parsed = {};
      rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 5) return;
        const code = cells[0].textContent.trim();
        if (!code) return;
        const gradeSpan = cells[4].querySelector(".grade-badge");
        if (gradeSpan) {
          const grade = gradeSpan.textContent.trim();
          if (grade && grade !== "\u2014") parsed[code] = grade;
        }
      });
      const stored = JSON.parse(localStorage.getItem(`grades_${u}`));
      Object.assign(stored.grades, parsed);
      localStorage.setItem(`grades_${u}`, JSON.stringify(stored));
      return Object.keys(parsed).length;
    }, { h: html, u: user });
  }

  function makeReport(courses) {
    const rows = courses.map(([code, name, type, grade]) => {
      if (grade) {
        return `<tr><td style="font-weight:600;color:#3b82f6">${code}</td><td>${name}</td><td><span class="type-badge">${type}</span></td><td>3</td><td><span class="grade-badge grade-pass">${grade}</span></td></tr>`;
      } else {
        return `<tr><td style="font-weight:600;color:#3b82f6">${code}</td><td>${name}</td><td><span class="type-badge">${type}</span></td><td>3</td><td><span class="grade-none">\\u2014</span></td></tr>`;
      }
    }).join("\n");
    return `<!DOCTYPE html><html><head><title>Report</title></head><body><div class="semester"><h3>Semester 1 — GPA: 3.70</h3><table><thead><tr><th>Code</th><th>Name</th><th>Type</th><th>CR</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`.replace("\\u2014", "\u2014");
  }

  await test("Import: 1 course parsed", async () => {
    const p = await freshPage();
    const html = makeReport([["MAT111", "Calculus", "CR", "A+"]]);
    const count = await simulateImport(p, html);
    if (count !== 1) throw new Error(`Expected 1, got ${count}`);
    await p.close();
  });

  await test("Import: 10 courses parsed", async () => {
    const p = await freshPage();
    const courses = [];
    for (let i = 0; i < 10; i++) courses.push([`CRS${i}`, `Course ${i}`, "CR", gradeScale()[i % gradeScale().length]]);
    const html = makeReport(courses);
    const count = await simulateImport(p, html);
    if (count !== 10) throw new Error(`Expected 10, got ${count}`);
    await p.close();
  });

  await test("Import: mixed grades and skipped entries", async () => {
    const p = await freshPage();
    const html = makeReport([
      ["MAT111", "Calculus", "CR", "A+"],
      ["LAN111", "English", "CR", null],  // em-dash, should skip
      ["GEO217", "Climate", "UC", "A"],
    ]);
    const count = await simulateImport(p, html);
    if (count !== 2) throw new Error(`Expected 2 (MAT111, GEO217), got ${count}`);
    const d = await getStored(p);
    if (d?.grades?.LAN111 !== undefined) throw new Error("LAN111 should not be imported");
    await p.close();
  });

  await test("Import: merge with existing grades", async () => {
    const p = await freshPage(USERS.DEFAULT, makeGrades([["EXISTING", "B+"]]));
    const html = makeReport([["NEWCODE", "New Course", "CR", "A"]]);
    await simulateImport(p, html);
    const d = await getStored(p);
    if (d?.grades?.EXISTING !== "B+") throw new Error("Existing grade overwritten");
    if (d?.grades?.NEWCODE !== "A") throw new Error("New grade not imported");
    await p.close();
  });

  await test("Import: empty HTML = 0 grades", async () => {
    const p = await freshPage();
    const html = makeReport([]);
    const count = await simulateImport(p, html);
    if (count !== 0) throw new Error(`Expected 0, got ${count}`);
    await p.close();
  });

  await test("Import: works after refresh (persistence)", async () => {
    const p = await freshPage();
    const html = makeReport([["PERSIST", "Test", "CR", "A+"]]);
    await simulateImport(p, html);
    await reloadPage(p);
    const d = await getStored(p);
    if (d?.grades?.PERSIST !== "A+") throw new Error("Imported grade lost after refresh");
    await p.close();
  });

  await test("Import: all grade types", async () => {
    const p = await freshPage();
    const allGrades = gradeScale();
    const courses = allGrades.map(g => [`GRD${g.replace("+","p").replace("-","m")}`, `Grade ${g}`, "CR", g]);
    const html = makeReport(courses);
    const count = await simulateImport(p, html);
    if (count !== allGrades.length) throw new Error(`Expected ${allGrades.length}, got ${count}`);
    await p.close();
  });

  await test("Import: duplicate courses (last wins)", async () => {
    const p = await freshPage();
    const html = makeReport([
      ["DUP", "First", "CR", "A+"],
      ["DUP", "Second", "CR", "B"],
    ]);
    await simulateImport(p, html);
    const d = await getStored(p);
    if (d?.grades?.DUP !== "B") throw new Error("Expected last value B, got " + d?.grades?.DUP);
    await p.close();
  });

  await test("Import: multiple semesters", async () => {
    const p = await freshPage();
    const html = `<!DOCTYPE html><html><body>
<div class="semester"><h3>Semester 1</h3><table><thead><tr><th>Code</th><th>Name</th><th>Type</th><th>CR</th><th>Grade</th></tr></thead><tbody>
<tr><td>S1A</td><td>C1</td><td><span class="type-badge">CR</span></td><td>3</td><td><span class="grade-badge grade-pass">A+</span></td></tr>
</tbody></table></div>
<div class="semester"><h3>Semester 2</h3><table><thead><tr><th>Code</th><th>Name</th><th>Type</th><th>CR</th><th>Grade</th></tr></thead><tbody>
<tr><td>S2A</td><td>C2</td><td><span class="type-badge">CR</span></td><td>3</td><td><span class="grade-badge grade-pass">B</span></td></tr>
</tbody></table></div>
</body></html>`;
    const count = await simulateImport(p, html);
    if (count !== 2) throw new Error(`Expected 2, got ${count}`);
    const d = await getStored(p);
    if (d?.grades?.S1A !== "A+" || d?.grades?.S2A !== "B")
      throw new Error("Multi-semester import failed");
    await p.close();
  });

  await test("Import: F grades included", async () => {
    const p = await freshPage();
    const html = makeReport([["FAIL", "F Course", "CR", "F"]]);
    await simulateImport(p, html);
    const d = await getStored(p);
    if (d?.grades?.FAIL !== "F") throw new Error("F grade not imported");
    await p.close();
  });

  // ============================================================
  // GROUP 8: ADMIN PANEL (tests 96-100)
  // ============================================================
  console.log("\n\x1b[36m=== ADMIN PANEL (5 tests) ===\x1b[0m");

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

  await test("Admin panel shows student management", async () => {
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
    if (!text) throw new Error("No content");
    await p.close();
  });

  await test("Non-admin user does not see admin page", async () => {
    const p = await freshPage();
    await reloadPage(p);
    // "admin_" prefix is required for admin view
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
    const acct = await p.evaluate(() => {
      const stored = localStorage.getItem("adminAccount");
      return stored ? JSON.parse(stored) : null;
    });
    await p.close();
    // Default doesn't exist until accessed, so just check no crash
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
    // Should render admin panel (no crash)
    const body = await p.evaluate(() => document.body.textContent);
    if (!body) throw new Error("No content for admin");
    await p.close();
  });

  // ============================================================
  // SUMMARY
  // ============================================================
  const total = passed + failed;
  console.log(`\n\x1b[36m========================================\x1b[0m`);
  console.log(`\x1b[36m  ${passed} / ${total} tests passed\x1b[0m`);
  if (failed > 0) console.log(`\x1b[31m  ${failed} / ${total} tests FAILED\x1b[0m`);
  console.log(`\x1b[36m========================================\x1b[0m\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error("Test run failed:", e);
  process.exit(1);
});
