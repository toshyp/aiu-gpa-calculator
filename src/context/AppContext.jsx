import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import programs from "../data/programs";
import courses from "../data/courses";
import prerequisites from "../data/prerequisites";
import gradeScale from "../data/gradeScale";
import { supabase, loadStudentData, saveStudentData, loadAdminData, saveAdminData, registerStudent, loginStudent, getAllStudents, getStudentDetails, deleteStudentAccount } from "../lib/supabase";

const AppContext = createContext();

const defaultUcPool = [
  { code: "GEO217", name: "Climate Change and Sustainability" },
  { code: "LAN111", name: "English Language 2" },
  { code: "LAN120", name: "German Language" },
  { code: "CSE013", name: "Introduction to Information Systems & Technology" },
  { code: "MGT222", name: "Entrepreneurship and Innovation" },
  { code: "AN114", name: "Artistic Appreciation" },
  { code: "LIB116", name: "Research and Analysis Skills" },
  { code: "LAN112", name: "Critical Thinking" },
];

const defaultUePool = [
  { code: "SOC107", name: "Community Participation in developing modern Egypt" },
  { code: "PSC207", name: "Contemporary International Issues" },
  { code: "LAN170A", name: "English for Specific Purposes (Pharmacy)" },
  { code: "LAN170B", name: "English for Specific Purposes (CS & Engineering)" },
  { code: "MGT201", name: "Negotiation Skills" },
  { code: "MGT102", name: "Strategic Planning" },
  { code: "MEC013", name: "Technical Report Writing" },
  { code: "ADL123", name: "First Aid" },
  { code: "ACC113", name: "Introduction to Accounting (for non-Business Students)" },
  { code: "ARC10", name: "Introduction to History of Art & Architecture" },
  { code: "CSE12", name: "Scientific Applications of Computers" },
  { code: "CSE16", name: "Introduction to Emerging Technologies and Their Risks" },
  { code: "FIN103", name: "Introduction to Economics (for non-Business Students)" },
  { code: "GEO114", name: "Character of Egypt" },
  { code: "GEO216", name: "Geography of Egypt and Middle East" },
  { code: "GEO218", name: "Medical Geography" },
  { code: "SOC216", name: "Principals of Statistics" },
  { code: "PYS103", name: "Introduction to Psychology" },
  { code: "PSY103", name: "Introduction to Psychology" },
  { code: "PSC209", name: "Arab-African Issues" },
  { code: "PSC111", name: "Introduction to Political Sciences" },
  { code: "PSC102", name: "Principles of International Law" },
  { code: "PHS71", name: "Health and Livability" },
  { code: "PHS61", name: "Introduction to Human Nutrition" },
  { code: "PHS21", name: "Public health Geography" },
  { code: "MGT121", name: "Introduction to Management (For Non-Business Students)" },
  { code: "MEC14", name: "History of Science (History of Engineering and Technology)" },
  { code: "LAN211", name: "Academic Writing" },
  { code: "LAN170", name: "English for specific purposes" },
  { code: "LAN140", name: "Chinese Language" },
  { code: "HIS113", name: "History of Arab-Islamic Civilization" },
];

function loadAdmin() {
  const stored = localStorage.getItem("adminAccount");
  if (stored) return JSON.parse(stored);
  return { username: "Ahmed", password: "3320" };
}

function loadPools() {
  try {
    const stored = localStorage.getItem("aiuPools");
    if (stored) return JSON.parse(stored);
  } catch {}
  return { ucPool: [...defaultUcPool], uePool: [...defaultUePool] };
}

function loadPrereqs() {
  try {
    const stored = localStorage.getItem("aiuPrereqs");
    if (stored) return JSON.parse(stored);
  } catch {}
  return JSON.parse(JSON.stringify(prerequisites));
}

function loadCourseOverrides() {
  try {
    const stored = localStorage.getItem("aiuCourseOverrides");
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => localStorage.getItem("aiuUser") || null);
  const [adminAccount, setAdminAccount] = useState(loadAdmin);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [grades, setGrades] = useState({});
  const [electiveSelections, setElectiveSelections] = useState({});
  const [ucSelections, setUcSelections] = useState({});
  const [ueSelections, setUeSelections] = useState({});
  const [completedCourses, setCompletedCourses] = useState({});
  const [semesterStatus, setSemesterStatus] = useState({});
  const [ucPool, setUcPool] = useState(loadPools().ucPool);
  const [uePool, setUePool] = useState(loadPools().uePool);
  const [prereqData, setPrereqData] = useState(loadPrereqs);
  const [courseOverrides, setCourseOverrides] = useState(loadCourseOverrides);
  const [dbReady, setDbReady] = useState(false);
  const [supabaseAvailable, setSupabaseAvailable] = useState(!!supabase);
  const [allStudents, setAllStudents] = useState([]);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("aiuTheme") || "dark");
  const [dataLoaded, setDataLoaded] = useState(false);

  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("aiuTheme", theme); } catch (e) { console.error("Failed to save theme:", e); }
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem("adminAccount", JSON.stringify(adminAccount)); } catch (e) { console.error("Failed to save adminAccount:", e); }
    if (supabaseAvailable) {
      saveAdminData("admin_account", { id: 1, username: adminAccount.username, password: adminAccount.password });
    }
  }, [adminAccount, supabaseAvailable]);

  useEffect(() => {
    try { localStorage.setItem("aiuPools", JSON.stringify({ ucPool, uePool })); } catch (e) { console.error("Failed to save pools:", e); }
  }, [ucPool, uePool]);

  useEffect(() => {
    try { localStorage.setItem("aiuPrereqs", JSON.stringify(prereqData)); } catch (e) { console.error("Failed to save prereqs:", e); }
  }, [prereqData]);

  useEffect(() => {
    try { localStorage.setItem("aiuCourseOverrides", JSON.stringify(courseOverrides)); } catch (e) { console.error("Failed to save overrides:", e); }
  }, [courseOverrides]);

  const loadFromDb = useCallback(async (studentId) => {
    if (!supabaseAvailable) return false;
    const data = await loadStudentData(studentId);
    if (data && !data.error) {
      setGrades(prev => ({ ...prev, ...(data.grades || {}) }));
      setElectiveSelections(prev => ({ ...prev, ...(data.electiveSelections || {}) }));
      setUcSelections(prev => ({ ...prev, ...(data.ucSlots || {}) }));
      setUeSelections(prev => ({ ...prev, ...(data.ueSlots || {}) }));
      return true;
    }
    return false;
  }, [supabaseAvailable]);

  useEffect(() => {
    if (!supabaseAvailable) {
      setDbReady(true);
      return;
    }
    loadAdminData().then(data => {
      if (data && !data.error) {
        if (data.admin) setAdminAccount(data.admin);
        if (data.prereqs && Array.isArray(data.prereqs)) {
          const map = {};
          data.prereqs.forEach(p => {
            if (!p) return;
            if (!map[p.course]) map[p.course] = [];
            map[p.course].push(p.prerequisite);
          });
          if (Object.keys(map).length) setPrereqData(prev => {
            const merged = { ...prev };
            for (const [course, prereqs] of Object.entries(map)) {
              if (prereqs.length === 0) {
                delete merged[course];
              } else {
                merged[course] = prereqs;
              }
            }
            return merged;
          });
        }
        if (data.overrides && data.overrides.length) {
          const ov = {};
          data.overrides.forEach(o => { ov[o.code] = { name: o.name, credits: o.credits }; });
          setCourseOverrides(prev => ({ ...ov, ...prev }));
        }
      }
      if (data && data.error) {
        setSupabaseAvailable(false);
      }
      setDbReady(true);
    }).catch(e => {
      console.error("loadAdminData failed:", e);
      setSupabaseAvailable(false);
      setDbReady(true);
    });
  }, [supabaseAvailable]);

  // Load data FIRST (before save effect) so save never fires with empty state
  useEffect(() => {
    if (user) {
      const key = `grades_${user}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setGrades(data.grades || {});
          setElectiveSelections(data.electiveSelections || {});
          setUcSelections(data.ucSelections || {});
          setUeSelections(data.ueSelections || {});
          setCompletedCourses(data.completedCourses || {});
          setSemesterStatus(data.semesterStatus || {});
          if (data.selectedProgram) setSelectedProgram(data.selectedProgram);
          if (data.selectedTrack) setSelectedTrack(data.selectedTrack);
        } catch (e) {
          console.error("Failed to parse stored grades data:", e);
        }
      } else if (supabaseAvailable) {
        // Only load from Supabase when localStorage is empty
        loadFromDb(user);
      }
      setDataLoaded(true);
    } else {
      setDataLoaded(false);
    }
  }, [user, supabaseAvailable, loadFromDb]);

  // Save effect: never fires until load effect has marked dataLoaded
  useEffect(() => {
    if (!user || !dataLoaded) return;
    saveUserData();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [grades, electiveSelections, ucSelections, ueSelections, completedCourses, semesterStatus, dataLoaded, user]);

  function saveUserData() {
    if (!user) return;
    const key = `grades_${user}`;
    try {
      localStorage.setItem(key, JSON.stringify({
        grades, electiveSelections, ucSelections, ueSelections,
        completedCourses, semesterStatus,
        selectedProgram, selectedTrack
      }));
    } catch (e) {
      console.error("Failed to save user data:", e);
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (supabaseAvailable) {
        const result = await saveStudentData(user, grades, ucSelections, ueSelections, electiveSelections, selectedProgram, selectedTrack);
        if (result?.error) console.error("saveStudentData error:", result.error);
      }
    }, 2000);
  }

  async function register(studentId, password) {
    try {
      if (!supabase) return "Supabase is not configured";
      const { data, error } = await registerStudent(studentId, password);
      if (error) {
        if (error.message && error.message.includes("duplicate")) {
          return "This ID is already registered. Please use a different ID or sign in.";
        }
        if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
          setSupabaseAvailable(false);
        } else {
          return error.message || "Registration failed";
        }
      }
      localStorage.setItem("aiuUser", studentId);
      setDataLoaded(false);
      setUser(studentId);
      setSelectedProgram(null);
      setSelectedTrack(null);
      setGrades({});
      setElectiveSelections({});
      setUcSelections({});
      setUeSelections({});
      setCompletedCourses({});
      setSemesterStatus({});
      setLoginError("");
      return null;
    } catch (e) {
      return e.message || "Registration failed due to a network error";
    }
  }

  async function login(userId, password) {
    try {
      if (supabaseAvailable && !userId.startsWith("admin_")) {
        const { data, error } = await loginStudent(userId, password);
        if (error || !data) {
          if (error) {
            return "Supabase is unavailable. Logging in locally.";
          }
          return "Invalid ID or password";
        }
      }
      localStorage.setItem("aiuUser", userId);
      setDataLoaded(false);
      setUser(userId);
      setSelectedProgram(null);
      setSelectedTrack(null);
      setGrades({});
      setElectiveSelections({});
      setUcSelections({});
      setUeSelections({});
      setCompletedCourses({});
      setSemesterStatus({});
      setLoginError("");
      return null;
    } catch (e) {
      return e.message || "Login failed due to a network error";
    }
  }

  const studentsControllerRef = useRef(null);

  const loadAllStudents = useCallback(async () => {
    try {
      if (!supabaseAvailable) return;
      if (studentsControllerRef.current) {
        studentsControllerRef.current.abort();
      }
      const controller = new AbortController();
      studentsControllerRef.current = controller;
      const list = await getAllStudents();
      if (!controller.signal.aborted) {
        setAllStudents(list || []);
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("loadAllStudents failed:", e);
    }
  }, [supabaseAvailable]);

  const detailsControllerRef = useRef(null);

  async function viewStudentDetails(studentId) {
    try {
      if (detailsControllerRef.current) {
        detailsControllerRef.current.abort();
      }
      const controller = new AbortController();
      detailsControllerRef.current = controller;
      const key = `grades_${studentId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (!controller.signal.aborted) {
            const gradesArr = Object.entries(data.grades || {}).map(([course_code, grade]) => ({ course_code, grade }));
            const ucArr = Object.entries(data.ucSelections || {}).map(([slot, course_code]) => ({ slot, course_code }));
            const ueArr = Object.entries(data.ueSelections || {}).map(([slot, course_code]) => ({ slot, course_code }));
            const electArr = Object.entries(data.electiveSelections || {}).map(([slot, course_code]) => ({ slot, course_code }));
            setStudentDetails({
              studentId, grades: gradesArr, ucSelections: ucArr, ueSelections: ueArr,
              electiveSelections: electArr, password: null, program: data.selectedProgram || null, track: data.selectedTrack || null,
            });
          }
          return;
        } catch (e) { /* failed to parse, fall through to Supabase */ }
      }
      if (!supabaseAvailable) return;
      const details = await getStudentDetails(studentId);
      if (!controller.signal.aborted && details) {
        setStudentDetails({ studentId, ...details });
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("viewStudentDetails failed:", e);
    }
  }

  async function removeStudent(studentId) {
    try {
      if (supabaseAvailable) {
        const { error } = await deleteStudentAccount(studentId);
        if (error) {
          console.error("Delete error:", error);
          return;
        }
      }
      const key = `grades_${studentId}`;
      localStorage.removeItem(key);
      setStudentDetails(null);
      await loadAllStudents();
    } catch (e) {
      console.error("removeStudent failed:", e);
    }
  }

  function logout() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    localStorage.removeItem("aiuUser");
    setDataLoaded(false);
    setUser(null);
    setSelectedProgram(null);
    setSelectedTrack(null);
    setGrades({});
    setElectiveSelections({});
    setUcSelections({});
    setUeSelections({});
    setCompletedCourses({});
    setSemesterStatus({});
  }

  function clearAllData() {
    if (!user) return;
    const key = `grades_${user}`;
    localStorage.removeItem(key);
    setGrades({});
    setElectiveSelections({});
    setUcSelections({});
    setUeSelections({});
    setCompletedCourses({});
    setSemesterStatus({});
  }

  function getCourseCredits(code) {
    if (courseOverrides[code]?.credits !== undefined) return courseOverrides[code].credits;
    if (courses[code]) return courses[code].credits;
    return 3;
  }

  function getCourseName(code) {
    if (courseOverrides[code]?.name) return courseOverrides[code].name;
    return courses[code]?.name || code;
  }

  function getEffectiveCourses() {
    const prog = getProgram();
    if (!prog) return [];
    const track = getTrack();
    const semesters = track ? track.semesters : prog.semesters;
    if (!semesters) return [];
    const all = [];
    semesters.forEach(sem => {
      if (!sem || !Array.isArray(sem.courses)) return;
      sem.courses.forEach((code, idx) => {
        const type = Array.isArray(sem.type) ? sem.type[idx] : "mandatory";
        let actualCode = code;
        if (type === "elective" && electiveSelections[code]) {
          actualCode = electiveSelections[code];
        }
        if (type === "university-requirement" && ucSelections[code]) {
          actualCode = ucSelections[code];
        }
        if (type === "university-elective" && ueSelections[code]) {
          actualCode = ueSelections[code];
        }
        all.push({ code: actualCode, slot: code, type, semester: sem.number });
      });
    });
    return all;
  }

  function checkPrerequisites(courseCode) {
    const prereqList = prereqData[courseCode];
    if (!prereqList || prereqList.length === 0) return { met: true, missing: [] };
    const missing = prereqList.filter(p => {
      if (p === "SENIOR_STANDING") return false;
      return !grades[p] || grades[p] === "F";
    });
    return { met: missing.length === 0, missing };
  }

  function setGrade(code, grade) {
    setGrades(prev => ({ ...prev, [code]: grade }));
  }

  function bulkSetGrades(newGrades) {
    setGrades(prev => ({ ...prev, ...newGrades }));
  }

  function selectElective(slot, courseCode) {
    setElectiveSelections(prev => ({ ...prev, [slot]: courseCode }));
    setGrades(prev => {
      if (prev[slot] && !prev[courseCode]) {
        const updated = { ...prev };
        updated[courseCode] = updated[slot];
        delete updated[slot];
        return updated;
      }
      return prev;
    });
  }

  function selectUC(slot, courseCode) {
    setUcSelections(prev => ({ ...prev, [slot]: courseCode }));
    setGrades(prev => {
      if (prev[slot] && !prev[courseCode]) {
        const updated = { ...prev };
        updated[courseCode] = updated[slot];
        delete updated[slot];
        return updated;
      }
      return prev;
    });
  }

  function selectUE(slot, courseCode) {
    setUeSelections(prev => ({ ...prev, [slot]: courseCode }));
    setGrades(prev => {
      if (prev[slot] && !prev[courseCode]) {
        const updated = { ...prev };
        updated[courseCode] = updated[slot];
        delete updated[slot];
        return updated;
      }
      return prev;
    });
  }

  function getGrade(code) {
    return grades[code] || "";
  }

  function getProgram() {
    return programs[selectedProgram] || null;
  }

  function getTrack() {
    const prog = getProgram();
    if (!prog || !prog.hasTracks || !selectedTrack) return null;
    return (prog.tracks && prog.tracks[selectedTrack]) || null;
  }

  function calcSemesterGPA(semCourses) {
    if (!semCourses || !Array.isArray(semCourses)) return 0;
    let totalPoints = 0, totalCredits = 0;
    semCourses.forEach(({ code }) => {
      const grade = grades[code];
      const pts = gradeScale[grade];
      const cr = getCourseCredits(code);
      if (pts !== undefined) {
        totalPoints += pts * cr;
        totalCredits += cr;
      }
    });
    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  }

  function calcCumulativeGPA() {
    const effective = getEffectiveCourses();
    let totalPoints = 0, totalCredits = 0;
    effective.forEach(({ code }) => {
      const grade = grades[code];
      const pts = gradeScale[grade];
      const cr = getCourseCredits(code);
      if (pts !== undefined) {
        totalPoints += pts * cr;
        totalCredits += cr;
      }
    });
    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  }

  function calcCompletedCredits() {
    const effective = getEffectiveCourses();
    let total = 0;
    effective.forEach(({ code }) => {
      const grade = grades[code];
      if (grade && grade !== "F" && grade !== "") {
        total += getCourseCredits(code);
      }
    });
    return total;
  }

  function calcRemainingCredits() {
    const prog = getProgram();
    if (!prog) return 0;
    const total = prog.totalCredits;
    const completed = calcCompletedCredits();
    return Math.max(0, total - completed);
  }

  function getUcPool() { return ucPool; }
  function getUePool() { return uePool; }

  function addToUcPool(course) {
    if (!ucPool.find(c => c.code === course.code)) {
      setUcPool(prev => {
        const updated = [...prev, course];
        if (supabaseAvailable) {
          saveAdminData("uc_pool", { slot: updated.length, code: course.code, name: course.name });
        }
        return updated;
      });
    }
  }
  function removeFromUcPool(code) {
    setUcPool(prev => prev.filter(c => c.code !== code));
    if (supabaseAvailable) {
      try { supabase.from("uc_pool").delete().eq("code", code).then(); } catch (e) { console.error("removeFromUcPool failed:", e); }
    }
  }
  function updateUcPool(code, field, value) {
    setUcPool(prev => {
      const updated = prev.map(c => c.code === code ? { ...c, [field]: value } : c);
      if (supabaseAvailable) {
        const idx = updated.findIndex(c => c.code === code);
        if (idx !== -1) {
          saveAdminData("uc_pool", { slot: idx + 1, ...updated[idx] });
        }
      }
      return updated;
    });
  }

  function addToUePool(course) {
    if (!uePool.find(c => c.code === course.code)) {
      setUePool(prev => {
        const updated = [...prev, course];
        if (supabaseAvailable) {
          saveAdminData("ue_pool", { slot: updated.length, code: course.code, name: course.name });
        }
        return updated;
      });
    }
  }
  function removeFromUePool(code) {
    setUePool(prev => prev.filter(c => c.code !== code));
    if (supabaseAvailable) {
      try { supabase.from("ue_pool").delete().eq("code", code).then(); } catch (e) { console.error("removeFromUePool failed:", e); }
    }
  }
  function updateUePool(code, field, value) {
    setUePool(prev => {
      const updated = prev.map(c => c.code === code ? { ...c, [field]: value } : c);
      if (supabaseAvailable) {
        const idx = updated.findIndex(c => c.code === code);
        if (idx !== -1) {
          saveAdminData("ue_pool", { slot: idx + 1, ...updated[idx] });
        }
      }
      return updated;
    });
  }

  function addPrereq(courseCode, prereqCode) {
    if (!prereqCode || !courseCode) return;
    setPrereqData(prev => {
      const existing = prev[courseCode] || [];
      if (existing.includes(prereqCode)) return prev;
      return { ...prev, [courseCode]: [...existing, prereqCode] };
    });
    if (supabaseAvailable) {
      saveAdminData("prerequisite", { course: courseCode, prerequisite: prereqCode });
    }
  }

  function removePrereq(courseCode, prereqCode) {
    setPrereqData(prev => {
      const list = prev[courseCode] || [];
      return { ...prev, [courseCode]: list.filter(p => p !== prereqCode) };
    });
    if (supabaseAvailable) {
      saveAdminData("remove_prerequisite", { course: courseCode, prerequisite: prereqCode });
    }
  }

  function getPrereqData() { return prereqData; }

  return (
    <AppContext.Provider value={{
      user, adminAccount, setAdminAccount,
      login, register, logout, loginError,
      selectedProgram, setSelectedProgram,
      selectedTrack, setSelectedTrack,
      programs, courses,
      grades, getGrade, setGrade, bulkSetGrades, saveUserData,
      electiveSelections, selectElective,
      ucSelections, selectUC,
      ueSelections, selectUE,
      getProgram, getTrack, getEffectiveCourses,
      getCourseCredits, checkPrerequisites,
      calcSemesterGPA, calcCumulativeGPA,
      calcCompletedCredits, calcRemainingCredits,
      completedCourses, clearAllData, semesterStatus,
      ucPool, uePool, getUcPool, getUePool,
      addToUcPool, removeFromUcPool, updateUcPool,
      addToUePool, removeFromUePool, updateUePool,
      prereqData, getPrereqData,
      addPrereq, removePrereq,
      courseOverrides, setCourseOverrides, getCourseName,
      dbReady, supabaseAvailable,
      allStudents, loadAllStudents,
      studentDetails, setStudentDetails, viewStudentDetails,
      removeStudent,
      theme, setTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
