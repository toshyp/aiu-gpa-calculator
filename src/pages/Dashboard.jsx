import { useState, useMemo, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "../components/Toast";
import gradeScale, { gradeOptions } from "../data/gradeScale";
import {
  BookOpen, GraduationCap, BarChart3, Save, LogOut,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Trash2,
  Target, TrendingUp, Layers, ArrowRight, Printer,
  Sun, Moon, Upload, X
} from "lucide-react";

export default function Dashboard() {
  const {
    user, logout, programs, courses,
    selectedProgram, setSelectedProgram,
    selectedTrack, setSelectedTrack,
    getProgram, getTrack, getEffectiveCourses,
    getCourseCredits, getGrade, setGrade,
    calcCumulativeGPA, calcCompletedCredits, calcRemainingCredits,
    grades, electiveSelections, selectElective, saveUserData, getCourseName,
    ucSelections, selectUC, ueSelections, selectUE,
    checkPrerequisites, clearAllData, getUcPool, getUePool,
    theme, setTheme, bulkSetGrades
  } = useApp();

  const { toast } = useToast();

  const [activeSem, setActiveSem] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [plannedInput, setPlannedInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [runAnalysis, setRunAnalysis] = useState(false);

  const [courseSearch, setCourseSearch] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importHtml, setImportHtml] = useState("");
  const importRef = useRef(null);
  const fileInputRef = useRef(null);

  function parseReportHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const rows = doc.querySelectorAll(".semester table tbody tr");
    const grades = {};
    rows.forEach(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 5) return;
      const code = cells[0].textContent.trim();
      if (!code) return;
      const gradeSpan = cells[4].querySelector(".grade-badge");
      if (gradeSpan) {
        const grade = gradeSpan.textContent.trim();
        if (grade && grade !== "\u2014") {
          grades[code] = grade;
        }
      }
    });
    return grades;
  }

  function parseReportText(text) {
    const grades = {};
    const gradeSet = new Set(["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F"]);
    const lines = text.split("\n");
    for (const line of lines) {
      const tokens = line.trim().split(/\s+/);
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i].toUpperCase();
        if (/^[A-Z]{3,4}\d{2,4}$/.test(t)) {
          for (let j = i + 1; j < Math.min(i + 15, tokens.length); j++) {
            const cleaned = tokens[j].replace(/[^A-Za-z0-9+-]/g, "");
            const grade = gradeSet.has(cleaned) ? cleaned : gradeSet.has(tokens[j]) ? tokens[j] : null;
            if (grade) { grades[t] = grade; break; }
          }
        }
      }
    }
    return grades;
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const PDF_VER = "3.11.174";
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_VER}/build/pdf.min.js`;
            s.onload = res; s.onerror = () => rej(new Error("Failed to load pdf.js"));
            document.head.appendChild(s);
          });
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_VER}/build/pdf.worker.min.js`;
        const buf = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
        const gradeSet = new Set(["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F"]);
        const found = {};
        const allLines = [];
        let needsOcr = false;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          if (!content.items || content.items.length === 0) {
            needsOcr = true;
            continue;
          }
          const yLines = {};
          for (const item of content.items) {
            if (!item.transform) continue;
            const y = Math.round(item.transform[5]);
            const x = Math.round(item.transform[4]);
            if (!yLines[y]) yLines[y] = [];
            yLines[y].push({ x, str: item.str || "" });
          }
          for (const y of Object.keys(yLines).map(Number).sort((a, b) => b - a)) {
            const row = yLines[y].sort((a, b) => a.x - b.x);
            const joined = row.map(i => i.str).join(" ").trim();
            allLines.push(joined);
            const tokens = joined.split(/\s+/);
            for (let t = 0; t < tokens.length; t++) {
              const code = tokens[t].toUpperCase();
              if (/^[A-Z]{3,4}\d{2,4}$/.test(code)) {
                for (let j = Math.max(0, t - 6); j < Math.min(tokens.length, t + 10); j++) {
                  if (j === t) continue;
                  const cleaned = tokens[j].replace(/[^A-Za-z0-9+-]/g, "");
                  if (gradeSet.has(cleaned)) { found[code] = cleaned; break; }
                }
              }
            }
          }
        }
        if (needsOcr) {
          toast("PDF is image-based, running OCR...");
          if (!window.Tesseract) {
            await new Promise((res, rej) => {
              const s = document.createElement("script");
              s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
              s.onload = res; s.onerror = () => rej(new Error("Failed to load Tesseract.js"));
              document.head.appendChild(s);
            });
          }
          const ocrPages = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const txt = await (await pdf.getPage(i)).getTextContent();
            if (!txt.items || txt.items.length === 0) ocrPages.push(i);
          }
          for (let idx = 0; idx < ocrPages.length; idx++) {
            const i = ocrPages[idx];
            toast(`OCR page ${idx + 1}/${ocrPages.length}...`);
            const page = await pdf.getPage(i);
            const vp = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement("canvas");
            canvas.width = vp.width;
            canvas.height = vp.height;
            const ctx2d = canvas.getContext("2d");
            await page.render({ canvasContext: ctx2d, viewport: vp }).promise;
            const { data: { text } } = await window.Tesseract.recognize(canvas, "eng+ara", { logger: () => {} });
            const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
            for (const joined of lines) {
              allLines.push(joined);
              const tokens = joined.split(/\s+/);
              for (let t = 0; t < tokens.length; t++) {
                const code = tokens[t].toUpperCase();
                if (/^[A-Z]{3,4}\d{2,4}$/.test(code)) {
                  for (let j = Math.max(0, t - 6); j < Math.min(tokens.length, t + 10); j++) {
                    if (j === t) continue;
                    const cleaned = tokens[j].replace(/[^A-Za-z0-9+-]/g, "");
                    if (gradeSet.has(cleaned)) { found[code] = cleaned; break; }
                  }
                }
              }
            }
          }
        }
        setImportHtml(allLines.join("\n"));
        const count = Object.keys(found).length;
        if (count > 0) {
          bulkSetGrades(found);
          setShowImportModal(false);
          toast(`Imported ${count} grades from PDF`);
        } else {
          toast("No grades found — raw text loaded in editor");
        }
      } catch (err) {
        toast("PDF error: " + (err.message || err));
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setImportHtml(ev.target?.result || "");
      reader.readAsText(file);
    }
  }

  function handleImport() {
    const isHtml = /<!DOCTYPE html|<html|<table|\.semester/i.test(importHtml);
    const parsed = isHtml ? parseReportHTML(importHtml) : parseReportText(importHtml);
    const count = Object.keys(parsed).length;
    if (count === 0) {
      toast("No grades found in the " + (isHtml ? "HTML" : "PDF text"));
      return;
    }
    bulkSetGrades(parsed);
    setShowImportModal(false);
    setImportHtml("");
    toast(`Imported ${count} grade${count > 1 ? "s" : ""} from report`);
  }

  function whatIfAnalysis() {
    const planned = parseFloat(plannedInput);
    const target = parseFloat(targetInput);
    if (!planned || planned < 1 || planned > 30 || !target || target < 0 || target > 4.0) {
      return { error: "Enter valid values (hours 1-30, GPA 0-4)" };
    }

    const curGPA = cumGPA;
    const curCredits = completedCredits;
    const curPoints = curGPA * curCredits;
    const totalAfter = curCredits + planned;
    const maxPoints = curPoints + 4.0 * planned;
    const maxGPA = maxPoints / totalAfter;

    if (target > maxGPA) {
      const shortfall = target * totalAfter - maxPoints;
      const denominator = 4.0 - target;
      const extraCredits = denominator > 0 ? Math.ceil(shortfall / denominator) : Infinity;
      return {
        achievable: false, maxGPA, extraCredits, planned, target,
        curGPA, curCredits,
      };
    }

    const neededPoints = target * totalAfter - curPoints;
    const neededAvg = neededPoints / planned;
    const numCourses = Math.max(1, Math.round(planned / 3));
    const chPerCourse = planned / numCourses;

    function calcGPA(avg) {
      return (curPoints + avg * planned) / totalAfter;
    }

    const sols = [];
    const seen = new Set();

    function addSolution(desc, grade, val, gpa) {
      const key = Math.round(gpa * 100);
      if (!seen.has(key)) {
        seen.add(key);
        sols.push({ desc, grade, val, newGPA: gpa });
      }
    }

    // 1. Best case
    addSolution("Best: A+ in all courses", "A+", 4.0, calcGPA(4.0));

    // 2. Minimum uniform grade that meets target
    const gradeList = [
      ["A+", 4.0], ["A", 4.0], ["A-", 3.7],
      ["B+", 3.3], ["B", 3.0], ["B-", 2.7],
      ["C+", 2.3], ["C", 2.0], ["C-", 1.7],
      ["D+", 1.3], ["D", 1.0],
    ];
    const minGrade = gradeList.find(g => calcGPA(g[1]) >= target);
    if (minGrade) {
      addSolution(
        `${minGrade[0]} in all courses — minimum grade to reach target`,
        minGrade[0], minGrade[1], calcGPA(minGrade[1])
      );
    }

    // 3-10. Mixed combinations
    const highGrades = [4.0, 3.7, 3.3, 3.0];
    const lowGrades = [3.3, 3.0, 2.7, 2.3, 2.0, 1.7];

    for (const high of highGrades) {
      for (const low of lowGrades) {
        if (high <= low) continue;
        for (let x = 1; x < numCourses; x++) {
          const y = numCourses - x;
          const avg = (high * x + low * y) / numCourses;
          const gpa = calcGPA(avg);
          if (gpa >= target) {
            const hLabel = gradeList.find(g => g[1] === high)?.[0] || "A";
            const lLabel = gradeList.find(g => g[1] === low)?.[0] || "C";
            addSolution(`${hLabel} in ${x} courses, ${lLabel} in ${y} courses`, avg.toFixed(2), avg, gpa);
          }
        }
      }
    }

    // Try all same intermediate grades
    for (const [name, val] of gradeList) {
      const gpa = calcGPA(val);
      if (gpa >= target) {
        addSolution(`${name} in all courses`, name, val, gpa);
      }
    }

    sols.sort((a, b) => b.newGPA - a.newGPA);
    return {
      achievable: true, maxGPA, planned, target,
      curGPA, curCredits, neededAvg,
      solutions: sols.slice(0, 10),
    };
  }

  const prog = getProgram();
  const track = getTrack();
  const effectiveCourses = getEffectiveCourses();
  const cumGPA = useMemo(() => calcCumulativeGPA(), [effectiveCourses, grades]);

  const completedCredits = useMemo(() => calcCompletedCredits(), [effectiveCourses, grades]);

  const remainingCredits = useMemo(() => calcRemainingCredits(), [effectiveCourses]);
  const analysisResult = useMemo(() => runAnalysis ? whatIfAnalysis() : null, [runAnalysis, plannedInput, targetInput, cumGPA, completedCredits, grades, effectiveCourses]);

  const semesters = track ? track.semesters : prog?.semesters || [];

  const techElectPools = track ? track.techElectPools : prog?.techElectPools || {};
  const ucSlots = track ? track.ucSlots : prog?.ucSlots || 0;
  const ueSlots = track ? track.ueSlots : prog?.ueSlots || 0;

  const semCourses = semesters.find(s => s.number === activeSem);
  const semTypes = semCourses ? semCourses.type || [] : [];

  function getSemesterCourses(semNum) {
    const sem = semesters.find(s => s.number === semNum);
    if (!sem || !Array.isArray(sem.courses)) return [];
    return sem.courses.map((code, idx) => {
      const type = sem.type ? sem.type[idx] || "mandatory" : "mandatory";
      let actualCode = code;
      if (type === "elective" && electiveSelections[code]) actualCode = electiveSelections[code];
      if (type === "university-requirement" && ucSelections[code]) actualCode = ucSelections[code];
      if (type === "university-elective" && ueSelections[code]) actualCode = ueSelections[code];
      const prereq = checkPrerequisites(actualCode);
      return { slot: code, code: actualCode, type, prereq };
    });
  }

  function calcSemGPA(semNum) {
    const courseList = getSemesterCourses(semNum);
    let pts = 0, crs = 0;
    courseList.forEach(({ code }) => {
      const g = getGrade(code);
      const scale = { "A+":4,"A":4,"A-":3.7,"B+":3.3,"B":3,"B-":2.7,"C+":2.3,"C":2,"C-":1.7,"D+":1.3,"D":1,"D-":0.7,"F":0 };
      const p = scale[g];
      const c = getCourseCredits(code);
      if (p !== undefined) { pts += p * c; crs += c; }
    });
    return crs > 0 ? (pts / crs).toFixed(2) : "—";
  }

  function printReport() {
    const totalCredits = trackOrProg.totalCredits;
    const gpa = showResults ? cumGPA.toFixed(2) : "\u2014";
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Academic Report - ' + user + '</title>' +
      '<style>' +
      '* { margin:0;padding:0;box-sizing:border-box; }' +
      'body { font-family:Segoe UI,Arial,sans-serif;background:#fff;color:#1e293b;padding:40px; }' +
      '.header { text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #3b82f6; }' +
      '.header h1 { font-size:22px;color:#0f172a;margin-bottom:2px;letter-spacing:-0.3px; }' +
      '.header .sub { color:#64748b;font-size:12px; }' +
      '.header .aiu { font-size:13px;color:#3b82f6;font-weight:700;margin-bottom:6px;letter-spacing:1px; }' +
      '.header .date { color:#94a3b8;font-size:11px;margin-top:4px; }' +
      '.info { display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap; }' +
      '.info-item { flex:1;min-width:130px;padding:14px 18px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0; }' +
      '.info-item .label { font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px; }' +
      '.info-item .value { font-size:20px;font-weight:700;color:#0f172a; }' +
      '.semester { margin-bottom:20px;page-break-inside:avoid; }' +
      '.semester h3 { font-size:14px;color:#0f172a;margin-bottom:6px;padding:8px 12px;background:#f1f5f9;border-radius:6px;display:flex;justify-content:space-between; }' +
      'table { width:100%;border-collapse:collapse;font-size:13px; }' +
      'th { text-align:left;padding:8px 12px;background:#f8fafc;color:#64748b;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.3px;border-bottom:2px solid #e2e8f0; }' +
      'td { padding:8px 12px;border-bottom:1px solid #f1f5f9; }' +
      'tr:last-child td { border-bottom:none; }' +
      '.grade-badge { display:inline-block;padding:2px 10px;border-radius:6px;font-weight:700;font-size:12px; }' +
      '.grade-pass { background:#dcfce7;color:#166534; }' +
      '.grade-fail { background:#fee2e2;color:#991b1b; }' +
      '.grade-none { color:#94a3b8;font-style:italic; }' +
      '.type-badge { display:inline-block;padding:1px 8px;border-radius:4px;font-size:10px;font-weight:600;background:#e2e8f0;color:#475569; }' +
      '.footer { text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;line-height:1.6; }' +
      '.prereq-warn { background:#fffbeb;font-size:11px;color:#d97706; }' +
      '.prereq-warn td { padding:6px 12px; }' +
      '@media print { body { padding:20px; } }' +
      '</style></head><body>' +
      '<div class="header">' +
      '<div class="aiu">ALAMEIN INTERNATIONAL UNIVERSITY</div>' +
      '<h1>Academic Report</h1>' +
      '<div class="sub">Faculty of Computer Science &amp; Engineering</div>' +
      '<div class="date">Generated: ' + dateStr + '</div></div>' +
      '<div class="info">' +
      '<div class="info-item"><div class="label">Student ID</div><div class="value">' + user + '</div></div>' +
      '<div class="info-item"><div class="label">Program</div><div class="value">' + prog.name + (track ? " \u2014 " + track.name : "") + '</div></div>' +
      '<div class="info-item"><div class="label">Cumulative GPA</div><div class="value">' + gpa + ' / 4.0</div></div>' +
      '<div class="info-item"><div class="label">Completed Credits</div><div class="value">' + completedCredits + ' / ' + totalCredits + '</div></div></div>';

    semesters.forEach(function (sem) {
      var semGPA = calcSemGPA(sem.number);
      var semList = getSemesterCourses(sem.number);
      html += '<div class="semester"><h3>Semester ' + sem.number + ' \u2014 GPA: ' + semGPA + '</h3><table><thead><tr><th>Code</th><th>Course Name</th><th>Type</th><th>Credits</th><th>Grade</th></tr></thead><tbody>';
      semList.forEach(function (item) {
        var code = item.code;
        var type = item.type;
        var prereq = item.prereq;
        var grade = getGrade(code);
        var cr = getCourseCredits(code);
        var typeLabel = type === "university-requirement" ? "UC" : type === "university-elective" ? "UE" : type === "field-training" ? "FT" : type === "graduation-project" ? "GP" : type === "elective" ? "TE" : "CR";
        var gradeClass = grade === "F" ? "grade-fail" : grade ? "grade-pass" : "grade-none";
        var courseName = courses[code] ? courses[code].name : code;
        html += '<tr><td style="font-weight:600;color:#3b82f6">' + code + '</td><td>' + courseName + '</td><td><span class="type-badge">' + typeLabel + '</span></td><td>' + cr + '</td><td>' + (grade ? '<span class="grade-badge ' + gradeClass + '">' + grade + '</span>' : '<span class="grade-none">\u2014</span>') + '</td></tr>';
        if (!prereq.met && grade) {
          html += '<tr class="prereq-warn"><td colspan="5">\u26A0 Prerequisite missing: ' + prereq.missing.join(", ") + '</td></tr>';
        }
      });
      html += '</tbody></table></div>';
    });

    html += '<div class="footer">This report was generated by AIU GPA Calculator \u2014 Alamein International University</div>';
    html += '</body></html>';
    var w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  }

  const univReqPool = getUcPool();
  const univElectPool = getUePool();

  const cardColors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ec4899"];

  if (!prog) {
    return (
      <div className="page-wrapper" style={{ minHeight: "100vh", background: "var(--bg-gradient)", padding: "20px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", paddingTop: "32px" }}>
          {/* Header */}
          <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: "linear-gradient(135deg, #1e40af, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(59,130,246,0.3)"
              }}>
                <span style={{ color: "var(--btn-text)", fontSize: "16px", fontWeight: 800, fontStyle: "italic" }}>AIU</span>
              </div>
              <div>
                <h1 style={{ color: "var(--text)", fontSize: "20px", fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>
                  GPA Calculator
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "2px 0 0" }}>
                  Faculty of Computer Science & Engineering
                </p>
              </div>
            </div>
            <button onClick={logout} style={{
              padding: "9px 18px", border: "1px solid var(--btn-secondary-border)",
              borderRadius: "10px", background: "var(--card-bg)", color: "var(--text-secondary)",
              cursor: "pointer", fontSize: "13px", fontWeight: 500,
              display: "flex", alignItems: "center", gap: "7px",
              transition: "all 0.2s"
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--card-border)"; e.currentTarget.style.color = "var(--btn-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--card-bg)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            ><LogOut size={15} /> Logout</button>
          </div>

          {/* Title */}
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ color: "var(--text)", fontSize: "22px", fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.3px" }}>
              Select Your Program
            </h2>
            <p style={{ color: "var(--text-secondary-2)", fontSize: "13px", margin: 0 }}>
              Choose your program to view your study plan and calculate your GPA
            </p>
          </div>

          {/* Program Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "16px" }}>
            {Object.values(programs).map((p, idx) => {
              const accent = cardColors[idx % cardColors.length];
              const isTracked = p.hasTracks;
              return (
                <div key={p.id} onClick={() => { setSelectedProgram(p.id); setSelectedTrack(null); }}
                  style={{
                    background: "var(--card-bg-2)", borderRadius: "18px", padding: "28px 24px 24px",
                    border: "1px solid var(--divider-2)", cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative", overflow: "hidden"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = accent;
                    e.currentTarget.style.boxShadow = `0 12px 40px var(--shadow), 0 0 0 1px ${accent}22 inset`;
                    e.currentTarget.style.background = "var(--divider)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "var(--divider-2)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.background = "var(--card-bg-2)";
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                    background: `linear-gradient(90deg, ${accent}, ${accent}88)`,
                    borderRadius: "18px 18px 0 0"
                  }} />
                  <GraduationCap size={32} color={accent} style={{ marginBottom: "14px", opacity: 0.9 }} />
                  <h3 style={{ color: "var(--text)", fontSize: "17px", fontWeight: 600, margin: "0 0 6px" }}>{p.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                      background: `${accent}18`, color: accent
                    }}>
                      {p.totalCredits} CR HRS
                    </span>
                    {isTracked && <span style={{
                      padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 500,
                      background: "var(--divider)", color: "var(--text-muted)"
                    }}>
                      <Layers size={11} style={{ verticalAlign: "middle", marginRight: "3px" }} />
                      Tracks
                    </span>}
                  </div>
                  <p style={{ color: "var(--text-secondary-2)", fontSize: "12px", margin: 0 }}>
                    {p.department}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (prog.hasTracks && !track) {
    const trackList = prog.tracks ? Object.values(prog.tracks) : [];
    if (trackList.length === 0) {
      return (
        <div className="page-wrapper" style={{ minHeight: "100vh", background: "var(--bg-gradient)", padding: "20px" }}>
          <div style={{ maxWidth: "680px", margin: "0 auto", paddingTop: "32px" }}>
            <p style={{ color: "var(--text-secondary)" }}>No tracks available for this program.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="page-wrapper" style={{ minHeight: "100vh", background: "var(--bg-gradient)", padding: "20px" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", paddingTop: "32px" }}>
          <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
            <div>
              <button onClick={() => { setSelectedProgram(null); setSelectedTrack(null); }}
                style={{
                  color: "var(--text-secondary-2)", background: "none", border: "none",
                  cursor: "pointer", fontSize: "13px", marginBottom: "12px", padding: 0,
                  display: "flex", alignItems: "center", gap: "6px",
                  transition: "color 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary-2)"}
              >
                ← Back to Programs
              </button>
              <h1 style={{ color: "var(--text)", fontSize: "24px", fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>
                {prog.name}
              </h1>
              <p style={{ color: "var(--text-secondary-2)", fontSize: "13px", margin: "4px 0 0" }}>
                Select your specialization track
              </p>
            </div>
            <button onClick={logout} style={{
              padding: "9px 18px", border: "1px solid var(--btn-secondary-border)",
              borderRadius: "10px", background: "var(--card-bg)", color: "var(--text-secondary)",
              cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "7px",
              transition: "all 0.2s"
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--card-border)"; e.currentTarget.style.color = "var(--btn-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--card-bg)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            ><LogOut size={15} /></button>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {trackList.map((t, idx) => {
              const accent = cardColors[idx % cardColors.length];
              return (
                <div key={t.id} onClick={() => setSelectedTrack(t.id)}
                  style={{
                    background: "var(--card-bg-2)", borderRadius: "16px", padding: "22px 24px",
                    border: "1px solid var(--divider-2)", cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateX(4px)";
                    e.currentTarget.style.borderColor = accent;
                    e.currentTarget.style.background = "var(--divider-2)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.borderColor = "var(--divider-2)";
                    e.currentTarget.style.background = "var(--card-bg-2)";
                  }}
                >
                  <div>
                    <h3 style={{ color: "var(--text)", fontSize: "16px", fontWeight: 600, margin: "0 0 4px" }}>
                      {t.name}
                    </h3>
                    <span style={{
                      padding: "2px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                      background: `${accent}18`, color: accent
                    }}>
                      {t.totalCredits} CR HRS
                    </span>
                  </div>
                  <ArrowRight size={20} color="var(--text-muted-2)" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const trackOrProg = track || prog;

  return (
    <div className="page-wrapper" style={{ minHeight: "100vh", background: "var(--bg-gradient)" }}>
      <div className="dashboard-content" style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px" }}>
        {/* Header */}
        <div className="page-header" style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "24px", flexWrap: "wrap", gap: "12px"
        }}>
          <div>
            <button onClick={() => { prog?.hasTracks ? setSelectedTrack(null) : setSelectedProgram(null); }}
              style={{
                color: "var(--text-secondary-2)", background: "none", border: "none",
                cursor: "pointer", fontSize: "13px", marginBottom: "6px", padding: 0,
                display: "flex", alignItems: "center", gap: "6px",
                transition: "color 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary-2)"}
            >
              ← Change Track / Program
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, #1e40af, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 3px 12px rgba(59,130,246,0.25)"
              }}>
                <span style={{ color: "var(--btn-text)", fontSize: "13px", fontWeight: 800, fontStyle: "italic" }}>AIU</span>
              </div>
              <div>
                <h1 style={{ color: "var(--text)", fontSize: "20px", fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>
                  {prog.name}{track ? " — " + track.name : ""}
                </h1>
                <p style={{ color: "var(--text-secondary-2)", fontSize: "12px", margin: "2px 0 0" }}>
                  Student: <span style={{ color: "var(--text-secondary)" }}>{user}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="page-header-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              style={{
                padding: "10px", border: "1px solid var(--card-border)", borderRadius: "10px",
                background: "var(--card-bg)", color: "var(--text-muted)", cursor: "pointer",
                display: "flex", transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--card-border)"; e.currentTarget.style.color = "var(--btn-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--card-bg)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => { saveUserData(); toast("Data saved!"); }}
              style={{
                padding: "10px 20px", border: "none", borderRadius: "10px",
                background: "var(--accent-gradient-2)", color: "var(--btn-text)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600,
                boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(59,130,246,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(59,130,246,0.3)"; }}
            ><Save size={15} /> Save</button>
            <button onClick={() => setShowImportModal(true)}
              style={{
                padding: "10px", border: "1px solid var(--card-border)", borderRadius: "10px",
                background: "var(--card-bg)", color: "var(--text-muted)", cursor: "pointer",
                display: "flex", transition: "all 0.2s"
              }}
              title="Import grades from a saved Print Report HTML file"
              onMouseEnter={e => { e.currentTarget.style.background = "var(--card-border)"; e.currentTarget.style.color = "var(--btn-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--card-bg)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            ><Upload size={16} /></button>
            <button onClick={logout} style={{
              padding: "10px", border: "1px solid var(--btn-secondary-border)",
              borderRadius: "10px", background: "var(--card-bg)", color: "var(--text-muted)", cursor: "pointer",
              transition: "all 0.2s"
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--card-border)"; e.currentTarget.style.color = "var(--btn-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--card-bg)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            ><LogOut size={16} /></button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards" style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px", marginBottom: "28px"
        }}>
          {[
            { label: "Total CR HRS", value: trackOrProg.totalCredits, color: "#3b82f6", icon: "📚" },
            { label: "Completed", value: completedCredits, color: "#22c55e", icon: "✅" },
            { label: "Remaining", value: remainingCredits, color: remainingCredits > 0 ? "#f59e0b" : "#22c55e", icon: remainingCredits > 0 ? "📋" : "✅" },
            { label: "CGPA", value: showResults ? cumGPA.toFixed(2) : "—", color: "#8b5cf6", icon: "🎯" },
          ].map(card => (
            <div key={card.label} style={{
              background: `linear-gradient(135deg, ${card.color}08, ${card.color}03)`,
              borderRadius: "16px", padding: "20px",
              border: `1px solid ${card.color}15`,
              transition: "all 0.2s"
            }}>
              <p style={{
                color: "var(--text-muted)", fontSize: "11px", margin: "0 0 10px",
                fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase"
              }}>
                {card.icon} {card.label}
              </p>
              <p style={{ color: card.color, fontSize: "30px", fontWeight: 700, margin: 0, letterSpacing: "-1px" }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Semester Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="semester-tabs-wrapper" style={{
            display: "flex", gap: "6px", overflowX: "auto", flex: 1
          }}>
          {semesters.map(sem => (
            <button key={sem.number} onClick={() => setActiveSem(sem.number)}
              style={{
                padding: "9px 18px", border: "none", borderRadius: "10px", cursor: "pointer",
                fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap",
                background: activeSem === sem.number
                  ? "linear-gradient(135deg, var(--accent-dark), var(--accent))"
                  : "var(--card-bg)",
                color: activeSem === sem.number ? "var(--btn-text)" : "var(--text-muted)",
                transition: "all 0.2s",
                boxShadow: activeSem === sem.number ? "0 4px 12px rgba(59,130,246,0.25)" : "none"
              }}>
              Semester {sem.number}
            </button>
          ))}
          <input
            type="text" placeholder="Search course..." value={courseSearch}
            onChange={e => setCourseSearch(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)",
              background: "var(--card-bg)", color: "var(--text)", fontSize: "12px",
              minWidth: "140px", outline: "none"
            }}
          />
        </div>
        </div>

        {/* Courses Table */}
        <div className="course-table" style={{
          background: "var(--card-bg-2)", borderRadius: "18px",
          border: "1px solid var(--divider-2)", overflow: "hidden", marginBottom: "16px"
        }}>
          <div style={{
            padding: "18px 22px", borderBottom: "1px solid var(--divider-2)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <h3 style={{ color: "var(--text)", fontSize: "15px", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={16} color="var(--accent)" />
              Semester {activeSem} — GPA: <span style={{ color: "#8b5cf6" }}>{calcSemGPA(activeSem)}</span>
            </h3>
            <span style={{ color: "var(--text-muted-2)", fontSize: "11px" }}>
              {semCourses ? semCourses.courses.length : 0} courses
            </span>
          </div>
          {semCourses && getSemesterCourses(activeSem)
            .filter(item => !courseSearch ||
              (item.code || "").toLowerCase().includes(courseSearch.toLowerCase()) ||
              (getCourseName(item.code) || "").toLowerCase().includes(courseSearch.toLowerCase()))
            .map((item, idx) => {
            const cr = getCourseCredits(item.code);
            const grade = getGrade(item.code);
            const isElective = item.type === "elective";
            const isUC = item.type === "university-requirement";
            const isUE = item.type === "university-elective";
            const isField = item.type === "field-training";
            const isGradProj = item.type === "graduation-project";
            const poolKey = item.slot;

            let badgeColor = "var(--accent)";
            if (isUC) badgeColor = "#8b5cf6";
            if (isUE) badgeColor = "#ec4899";
            if (isField) badgeColor = "var(--success)";
            if (isGradProj) badgeColor = "var(--warning)";
            if (isElective) badgeColor = "var(--badge-text)";

            return (
              <div key={item.slot} style={{
                padding: "14px 22px",
                borderBottom: idx < semCourses.courses.length - 1 ? "1px solid var(--divider)" : "none",
                display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap",
                transition: "background 0.2s"
              }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--card-bg-3)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Type Badge */}
                <span style={{
                  padding: "3px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 700,
                  background: badgeColor + "18", color: badgeColor, whiteSpace: "nowrap",
                  letterSpacing: "0.5px", minWidth: "32px", textAlign: "center"
                }}>
                  {item.type === "university-requirement" ? "UC" :
                   item.type === "university-elective" ? "UE" :
                   item.type === "field-training" ? "FT" :
                   item.type === "graduation-project" ? "GP" :
                   item.type === "elective" ? "TE" : "CR"}
                </span>

                {/* Prerequisite Warning */}
                {!item.prereq.met && (
                  <span title={"Missing: " + item.prereq.missing.join(", ")}
                    style={{ display: "flex", cursor: "help" }}>
                    <AlertTriangle size={14} color="var(--warning)" />
                  </span>
                )}

                {/* Course Info */}
                <div style={{ flex: 1, minWidth: "120px" }}>
                  <p style={{ color: "var(--text)", fontSize: "13px", margin: 0, fontWeight: 600 }}>
                    {item.code}
                  </p>
                  <p style={{ color: "var(--text-secondary-2)", fontSize: "11px", margin: "1px 0 0" }}>
                    {courses[item.code]?.name || item.code}
                  </p>
                </div>

                {/* Credits */}
                <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 500, minWidth: "36px" }}>
                  {cr} CH
                </span>

                {/* Elective Selector */}
                {(isElective || isUC || isUE) && (
                  <select
                    value={item.code}
                    onChange={e => {
                      if (isElective) selectElective(item.slot, e.target.value);
                      if (isUC) selectUC(item.slot, e.target.value);
                      if (isUE) selectUE(item.slot, e.target.value);
                    }}
                    style={{
                      padding: "7px 12px", borderRadius: "8px", border: "1px solid var(--card-border)",
                      background: "var(--card-bg)", color: "var(--text)", fontSize: "12px",
                      maxWidth: "190px", cursor: "pointer",
                      transition: "border-color 0.2s"
                    }}
                  >
                    <option value={item.slot}>
                      — Select Course —
                    </option>
                    {(() => {
                      let pool = [];
                      if (isElective) pool = techElectPools[poolKey] || [];
                      if (isUC) {
                        const selectedElsewhere = Object.entries(ucSelections)
                          .filter(([s]) => s !== item.slot)
                          .map(([, v]) => v);
                        pool = univReqPool.map(c => c.code).filter(c => !selectedElsewhere.includes(c));
                      }
                      if (isUE) {
                        const selectedElsewhere = Object.entries(ueSelections)
                          .filter(([s]) => s !== item.slot)
                          .map(([, v]) => v);
                        pool = univElectPool.map(c => c.code).filter(c => !selectedElsewhere.includes(c));
                      }
                      return pool.map(cCode => (
                        <option key={cCode} value={cCode}>
                          {cCode} — {courses[cCode]?.name || cCode}
                        </option>
                      ));
                    })()}
                  </select>
                )}

                    {/* Grade Selector */}
                <select
                  value={grade}
                  onChange={e => setGrade(item.code, e.target.value)}
                  style={{
                    padding: "7px 12px", borderRadius: "8px", border: "1px solid var(--card-border)",
                    background: grade ? "rgba(34,197,94,0.08)" : "var(--input-bg-2)",
                    color: grade ? "var(--success)" : "var(--text-secondary)", fontSize: "12px", fontWeight: 600,
                    cursor: "pointer", minWidth: "70px",
                    transition: "all 0.2s"
                  }}
                >
                  <option value="">—</option>
                  {gradeOptions.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* Calculate Button */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
          <button onClick={() => setShowResults(true)}
            style={{
              padding: "14px 32px", border: "none", borderRadius: "12px",
              background: "var(--accent-gradient)",
              color: "var(--btn-text)", fontSize: "15px", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "8px",
              boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.35)"; }}
          >
            <BarChart3 size={18} /> Calculate GPA
          </button>
          <button onClick={printReport}
            style={{
              padding: "14px 24px", border: "1px solid var(--tab-active-border)", borderRadius: "12px",
              background: "var(--tab-active-bg)", color: "var(--accent-light)",
              fontSize: "14px", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "8px",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--tab-active-bg)"; }}
          >
            <Printer size={16} /> Print Report
          </button>
          <button onClick={clearAllData}
            style={{
              padding: "14px 24px", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px",
              background: "var(--danger-bg)", color: "var(--danger)",
              fontSize: "14px", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "8px",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--danger-bg)"; }}
          >
            <Trash2 size={16} /> Clear All
          </button>
        </div>

        {/* GPA Results */}
        {showResults && (
          <div style={{
            background: "var(--card-bg-2)",
            borderRadius: "18px",
            border: "1px solid var(--divider-2)", padding: "28px", marginBottom: "20px"
          }}>
            <h3 style={{ color: "var(--text)", fontSize: "17px", fontWeight: 600, margin: "0 0 20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle size={20} color="#8b5cf6" /> GPA Results
            </h3>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px"
            }}>
              <div style={{ textAlign: "center", padding: "24px", background: "var(--card-bg-2)", borderRadius: "14px", border: "1px solid var(--divider)" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "11px", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "1px" }}>Cumulative GPA</p>
                <p style={{
                  color: cumGPA >= 3.5 ? "var(--success)" : cumGPA >= 2.5 ? "var(--warning)" : "var(--danger)",
                  fontSize: "42px", fontWeight: 700, margin: 0, letterSpacing: "-2px"
                }}>{cumGPA.toFixed(2)}</p>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "4px 0 0" }}>/ 4.0</p>
              </div>
              <div style={{ textAlign: "center", padding: "24px", background: "var(--card-bg-2)", borderRadius: "14px", border: "1px solid var(--divider)" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "11px", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "1px" }}>Completed Credits</p>
                <p style={{ color: "var(--success)", fontSize: "42px", fontWeight: 700, margin: 0, letterSpacing: "-2px" }}>{completedCredits}</p>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "4px 0 0" }}>/ {trackOrProg.totalCredits}</p>
              </div>
            </div>

            {/* Per-semester breakdown */}
            <h4 style={{ color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, margin: "0 0 14px" }}>Semester Breakdown</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
              {semesters.map(sem => (
                <div key={sem.number} style={{
                  padding: "14px 10px", background: "var(--card-bg-2)", borderRadius: "10px", textAlign: "center",
                  border: "1px solid var(--divider)"
                }}>
                  <p style={{ color: "var(--text-secondary-2)", fontSize: "11px", margin: "0 0 6px", fontWeight: 500 }}>Sem {sem.number}</p>
                  <p style={{ color: "var(--text)", fontSize: "18px", fontWeight: 700, margin: 0 }}>
                    {calcSemGPA(sem.number)}
                  </p>
                </div>
              ))}
            </div>

            {/* Completed Courses List */}
            <h4 style={{ color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, margin: "20px 0 12px" }}>Completed Courses</h4>
            <div style={{ display: "grid", gap: "6px" }}>
              {effectiveCourses
                .filter(({ code }) => getGrade(code) && getGrade(code) !== "F")
                .map(({ code, semester }) => (
                  <div key={code + semester} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", background: "var(--card-bg-2)", borderRadius: "10px",
                    border: "1px solid var(--divider)"
                  }}>
                    <div>
                      <span style={{ color: "var(--text)", fontSize: "13px", fontWeight: 500 }}>{code}</span>
                      <span style={{ color: "var(--text-secondary-2)", fontSize: "12px", marginLeft: "8px" }}>
                        {courses[code]?.name || ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                        Sem {semester} · {getCourseCredits(code)} CH
                      </span>
                      <span style={{
                        padding: "2px 10px", borderRadius: "6px",
                        color: "var(--success)", fontSize: "12px", fontWeight: 700,
                        background: "var(--success-bg)"
                      }}>
                        {getGrade(code)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* What-If Analysis */}
        <div style={{ marginTop: "0" }}>
          <button onClick={() => setShowWhatIf(!showWhatIf)}
            style={{
              padding: "14px 22px", borderRadius: "14px",
              background: showWhatIf ? "rgba(59,130,246,0.12)" : "var(--tab-active-bg)",
              color: "var(--accent-light)", fontSize: "14px", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "8px", width: "100%",
              transition: "all 0.25s ease",
              border: showWhatIf ? "1px solid var(--tab-active-border)" : "1px solid transparent",
            }}>
              <Target size={18} />
              <span style={{ flex: 1, textAlign: "right" }}>What-If Analysis: How to reach a target CGPA?</span>
              {showWhatIf ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

          {showWhatIf && (
            <div style={{
              marginTop: "12px", padding: "20px", borderRadius: "16px",
              background: "rgba(59,130,246,0.05)",
              border: "1px solid var(--tab-active-bg)",
            }}>
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 16px" }}>
                Current CGPA: <strong style={{ color: "var(--text)" }}>{cumGPA.toFixed(2)}</strong>
                {" | "}Completed Credits: <strong style={{ color: "var(--text)" }}>{completedCredits}</strong>
              </p>

              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: "120px" }}>
                  <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "6px" }}>
                    Planned credits next semester?
                  </label>
                  <input type="number" min="1" max="30" value={plannedInput}
                    onChange={e => { setPlannedInput(e.target.value); setRunAnalysis(false); }}
                    placeholder="e.g. 9"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "var(--divider)", color: "var(--text)",
                      fontSize: "14px", outline: "none", boxSizing: "border-box",
                    }} />
                </div>
                <div style={{ flex: 1, minWidth: "120px" }}>
                  <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "6px" }}>
                    Target CGPA?
                  </label>
                  <input type="number" step="0.1" min="0" max="4" value={targetInput}
                    onChange={e => { setTargetInput(e.target.value); setRunAnalysis(false); }}
                    placeholder="e.g. 2.0"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "var(--divider)", color: "var(--text)",
                      fontSize: "14px", outline: "none", boxSizing: "border-box",
                    }} />
                </div>
                <button onClick={() => setRunAnalysis(true)}
                  style={{
                    padding: "10px 24px", border: "none", borderRadius: "10px",
                    background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
                    color: "var(--btn-text)", fontSize: "14px", fontWeight: 600,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                    whiteSpace: "nowrap",
                  }}>
                  <BarChart3 size={16} /> Analyze
                </button>
              </div>

              {analysisResult && analysisResult.error && (
                <div style={{ padding: "12px", background: "var(--danger-bg)", borderRadius: "10px", color: "var(--danger)", fontSize: "13px" }}>
                  {analysisResult.error}
                </div>
              )}

              {analysisResult && !analysisResult.error && !analysisResult.achievable && (
                <div>
                  <div style={{
                    padding: "16px", background: "var(--danger-bg)", borderRadius: "12px",
                    border: "1px solid rgba(239,68,68,0.2)", marginBottom: "16px",
                  }}>
                    <p style={{ color: "#f87171", fontSize: "14px", fontWeight: 600, margin: "0 0 8px" }}>
                      ❌ Cannot reach {analysisResult.target.toFixed(1)} with only {analysisResult.planned} credits
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 4px" }}>
                      Max CGPA achievable with {analysisResult.planned} credits: <strong style={{ color: "#fbbf24" }}>{analysisResult.maxGPA.toFixed(3)}</strong>
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
                      To reach {analysisResult.target.toFixed(1)}, you need <strong style={{ color: "#fbbf24" }}>{analysisResult.extraCredits}</strong> additional credits (total {analysisResult.planned + analysisResult.extraCredits} credits) all at A+
                    </p>
                  </div>
                  {/* Also show best achievable with current planned */}
                  <div style={{
                    padding: "16px", background: "rgba(59,130,246,0.08)", borderRadius: "12px",
                    border: "1px solid var(--tab-active-bg)",
                  }}>
                    <p style={{ color: "var(--accent-light)", fontSize: "14px", fontWeight: 600, margin: "0 0 12px" }}>
                      🎯 Improvement plans within {analysisResult.planned} credit hours:
                    </p>
                    {(() => {
                      const budget = analysisResult.planned;
                      const cp = cumGPA * completedCredits;

                      // Get student's courses with grades, sorted worst-first
                      const allLow = Object.entries(grades)
                        .filter(([code, g]) => g && g !== "" && courses[code])
                        .map(([code, g]) => ({
                          code, name: courses[code]?.name || code,
                          grade: g, credits: getCourseCredits(code),
                          points: gradeScale[g] || 0,
                        }))
                        .filter(c => c.credits > 0 && c.points < 4.0)
                        .sort((a, b) => a.points - b.points);

                      if (allLow.length === 0) {
                        return <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>No courses to improve.</p>;
                      }

                      const targets = [
                        ["A", 4.0], ["A-", 3.7], ["B+", 3.3],
                        ["B", 3.0], ["B-", 2.7],
                      ];

                      function calcGPA(changes) {
                        let pts = cp;
                        for (const ch of changes) pts = pts - ch.oldPts * ch.cr + ch.newPts * ch.cr;
                        return completedCredits > 0 ? pts / completedCredits : 0;
                      }

                      const plans = [];
                      const seen = new Set();

                      // ---- Single-course plans ----
                      for (const c of allLow) {
                        if (c.credits > budget) continue;
                        for (const [gName, gVal] of targets) {
                          if (gVal <= c.points) continue;
                          const gpa = calcGPA([{ oldPts: c.points, newPts: gVal, cr: c.credits }]);
                          const k = Math.round(gpa * 100);
                          if (!seen.has(k)) { seen.add(k);
                            plans.push({ courses: [{ ...c, from: c.grade, to: gName }], totalCr: c.credits, gpa });
                          }
                        }
                      }

                      // ---- Multi-course combos within budget ----
                      const topN = allLow.slice(0, 6);
                      function combos(arr, start, cur) {
                        const res = [];
                        const sum = cur.reduce((s, x) => s + x.credits, 0);
                        if (cur.length >= 2 && sum <= budget) res.push([...cur]);
                        for (let i = start; i < arr.length; i++) {
                          if (sum + arr[i].credits <= budget) res.push(...combos(arr, i + 1, [...cur, arr[i]]));
                        }
                        return res;
                      }
                      const courseCombos = combos(topN, 0, []);
                      for (const combo of courseCombos.slice(0, 30)) {
                        for (const [gName, gVal] of targets.slice(0, 3)) {
                          const changes = combo.map(c => ({ oldPts: c.points, newPts: Math.max(gVal, c.points), cr: c.credits }));
                          const gpa = calcGPA(changes);
                          const k = Math.round(gpa * 100);
                          if (gpa > cumGPA + 0.001 && !seen.has(k)) { seen.add(k);
                            plans.push({
                              courses: combo.map(c => ({ ...c, from: c.grade, to: gName })),
                              totalCr: combo.reduce((s, c) => s + c.credits, 0),
                              gpa,
                            });
                          }
                        }
                      }

                      plans.sort((a, b) => b.gpa - a.gpa);
                      if (plans.length === 0) return <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>No improvement plans fit within {budget} credits.</p>;
                      return plans.slice(0, 8).map((plan, i) => (
                        <div key={i} style={{
                          padding: "10px 14px", marginBottom: "6px",
                          background: "var(--card-bg-2)", borderRadius: "10px",
                          border: "1px solid var(--divider-2)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 600 }}>Plan {i + 1}</span>
                            <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>{plan.totalCr} CH used</span>
                          </div>
                          {plan.courses.map((c, j) => (
                            <div key={j} style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "4px 0", borderTop: j > 0 ? "1px solid var(--divider)" : "none",
                            }}>
                              <div style={{ flex: 1 }}>
                                <span style={{ color: "var(--text)", fontSize: "12px", fontWeight: 500 }}>{c.code}</span>
                                <span style={{ color: "var(--text-secondary)", fontSize: "11px", marginLeft: "6px" }}>{c.name}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ color: "var(--danger)", fontSize: "12px", fontWeight: 600 }}>{c.from}</span>
                                <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>→</span>
                                <span style={{ color: "var(--success)", fontSize: "12px", fontWeight: 600 }}>{c.to}</span>
                                <span style={{ color: "var(--text-secondary)", fontSize: "11px", marginLeft: "4px" }}>({c.credits} CH)</span>
                              </div>
                            </div>
                          ))}
                          <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            marginTop: "6px", paddingTop: "6px", borderTop: "1px solid var(--divider-2)",
                          }}>
                            <span style={{ color: "#94a3b8", fontSize: "11px" }}>
                              {cumGPA.toFixed(2)} → <strong style={{ color: plan.gpa >= analysisResult.target ? "var(--success)" : "#fbbf24" }}>{plan.gpa.toFixed(3)}</strong>
                              {plan.gpa >= analysisResult.target ? " ✅ reaches target" : ""}
                            </span>
                          {(() => {
                            const pct = cumGPA > 0 ? ((plan.gpa - cumGPA) / cumGPA * 100).toFixed(1) + "%" : "—";
                            return <span style={{ color: "var(--success)", fontSize: "12px", fontWeight: 600 }}>+{pct}</span>;
                          })()}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {analysisResult && !analysisResult.error && analysisResult.achievable && (
                <div>
                  <div style={{
                    padding: "16px", background: "var(--success-bg)", borderRadius: "12px",
                    border: "1px solid rgba(34,197,94,0.2)", marginBottom: "16px",
                  }}>
                    <p style={{ color: "#4ade80", fontSize: "14px", fontWeight: 600, margin: "0 0 4px" }}>
                      ✅ You can reach {analysisResult.target.toFixed(1)} with {analysisResult.planned} credits!
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
                      Need average of {analysisResult.neededAvg.toFixed(2)} / 4.0 in the new courses
                      {" | "}Max achievable CGPA: <strong style={{ color: "#fbbf24" }}>{analysisResult.maxGPA.toFixed(3)}</strong>
                    </p>
                  </div>

                  <p style={{ color: "#cbd5e1", fontSize: "14px", fontWeight: 600, margin: "0 0 12px" }}>
                    🎯 {Math.min(10, analysisResult.solutions.length)} different solutions:
                  </p>
                  <div style={{ display: "grid", gap: "6px" }}>
                    {analysisResult.solutions.map((sol, i) => (
                      <div key={i} style={{
                        padding: "10px 14px", borderRadius: "10px",
                        background: i === 0 ? "rgba(34,197,94,0.08)" : "var(--card-bg-2)",
                        border: i === 0 ? "1px solid rgba(34,197,94,0.2)" : "1px solid transparent",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "var(--text)", fontSize: "13px", fontWeight: 500 }}>
                            {sol.desc}
                          </span>
                          <span style={{
                            color: sol.newGPA >= cumGPA ? "var(--success)" : "var(--warning)",
                            fontSize: "14px", fontWeight: "bold",
                          }}>
                            {sol.newGPA.toFixed(3)}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                          <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                            Grade: {sol.grade}
                          </span>
                          <span style={{
                            color: "var(--text-secondary)", fontSize: "12px",
                          }}>
                          {(() => {
                            const pct2 = cumGPA > 0 ? ((sol.newGPA - cumGPA) * 100 / cumGPA).toFixed(1) + "% improvement" : "—";
                            return <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>+{pct2}</span>;
                          })()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {analysisResult.maxGPA < 4.0 && (
                    <div style={{ marginTop: "16px", padding: "14px", background: "rgba(59,130,246,0.08)", borderRadius: "10px" }}>
                      <p style={{ color: "#93c5fd", fontSize: "13px", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                        <TrendingUp size={14} />
                        To reach the max CGPA ({analysisResult.maxGPA.toFixed(3)}), take more credits or retake old courses
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          textAlign: "center", padding: "32px 0 20px",
          borderTop: "1px solid var(--divider)", marginTop: "8px"
        }}>
          <span style={{ color: "rgba(148,163,184,0.25)", fontSize: "12px", letterSpacing: "0.5px" }}>
            AIU GPA Calculator — Alamein International University © {new Date().getFullYear()}
          </span>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div ref={importRef} style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
          }}
            onClick={e => { if (e.target === importRef.current) setShowImportModal(false); }}
          >
            <div style={{
              background: "var(--card-bg)", borderRadius: "16px",
              border: "1px solid var(--card-border)",
              maxWidth: "640px", width: "100%", padding: "24px",
              boxShadow: "0 24px 80px rgba(0,0,0,0.4)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ color: "var(--text)", fontSize: "17px", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Upload size={18} color="var(--accent)" /> Import Grades from Report
                </h3>
                <button onClick={() => setShowImportModal(false)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ color: "var(--text-secondary-2)", fontSize: "13px", margin: "0 0 12px" }}>
                Open your saved Print Report HTML file and paste the contents below,
                or upload the file directly.
                The system will extract all course codes and grades.
              </p>
              <input ref={fileInputRef} type="file" accept=".html,.htm,.pdf"
                onChange={handleFileUpload}
                style={{ display: "none" }} />
              <button onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--card-border)",
                  background: "var(--card-bg-2)", color: "var(--accent-light)",
                  cursor: "pointer", fontSize: "13px", fontWeight: 500, marginBottom: "10px",
                  display: "flex", alignItems: "center", gap: "6px"
                }}
              ><Upload size={14} /> Upload Report File</button>
              <textarea
                value={importHtml}
                onChange={e => setImportHtml(e.target.value)}
                placeholder={"<html>...</html>"}
                rows={10}
                style={{
                  width: "100%", padding: "12px", borderRadius: "10px",
                  border: "1px solid var(--card-border)",
                  background: "var(--input-bg)", color: "var(--text)",
                  fontSize: "12px", fontFamily: "monospace", resize: "vertical",
                  outline: "none", boxSizing: "border-box"
                }}
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
                <button onClick={() => setShowImportModal(false)}
                  style={{
                    padding: "10px 20px", borderRadius: "10px",
                    border: "1px solid var(--card-border)",
                    background: "var(--card-bg)", color: "var(--text-secondary)",
                    cursor: "pointer", fontSize: "13px", fontWeight: 500
                  }}
                >Cancel</button>
                <button onClick={handleImport}
                  style={{
                    padding: "10px 24px", borderRadius: "10px", border: "none",
                    background: "var(--accent-gradient)", color: "var(--btn-text)",
                    cursor: "pointer", fontSize: "13px", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: "6px"
                  }}
                ><Upload size={15} /> Import</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
