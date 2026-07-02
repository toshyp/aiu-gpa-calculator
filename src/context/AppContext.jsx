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
  { code: "PSC207", name: "Contemporary Global Issues" },
  { code: "LAN170A", name: "English for Specific Purposes (Pharmacy)" },
  { code: "LAN170B", name: "English for Specific Purposes (CS & Engineering)" },
  { code: "MGT201", name: "Negotiation Skills" },
  { code: "MGT102", name: "Strategic Planning" },
  { code: "MEC013", name: "Technical Report Writing" },
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
  const [user, setUser] = useState(null);
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
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("adminAccount", JSON.stringify(adminAccount));
    if (supabaseAvailable) {
      saveAdminData("admin_account", { id: 1, username: adminAccount.username, password: adminAccount.password });
    }
  }, [adminAccount, supabaseAvailable]);

  useEffect(() => {
    localStorage.setItem("aiuPools", JSON.stringify({ ucPool, uePool }));
  }, [ucPool, uePool]);

  useEffect(() => {
    localStorage.setItem("aiuPrereqs", JSON.stringify(prereqData));
  }, [prereqData]);

  useEffect(() => {
    localStorage.setItem("aiuCourseOverrides", JSON.stringify(courseOverrides));
  }, [courseOverrides]);

  useEffect(() => {
    if (!user) return;
    saveUserData();
  }, [grades, electiveSelections, ucSelections, ueSelections]);

  const loadFromDb = useCallback(async (studentId) => {
    if (!supabaseAvailable) return false;
    const data = await loadStudentData(studentId);
    if (data && !data.error) {
      if (data.grades) setGrades(data.grades);
      if (data.electiveSelections) setElectiveSelections(data.electiveSelections);
      if (data.ucSlots) setUcSelections(data.ucSlots);
      if (data.ueSlots) setUeSelections(data.ueSlots);
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
        if (data.prereqs) {
          const map = {};
          data.prereqs.forEach(p => {
            if (!map[p.course]) map[p.course] = [];
            map[p.course].push(p.prerequisite);
          });
          if (Object.keys(map).length) setPrereqData(map);
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
    });
  }, [supabaseAvailable]);

  useEffect(() => {
    if (user) {
      const key = `grades_${user}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        setGrades(data.grades || {});
        setElectiveSelections(data.electiveSelections || {});
        setUcSelections(data.ucSelections || {});
        setUeSelections(data.ueSelections || {});
        setCompletedCourses(data.completedCourses || {});
        setSemesterStatus(data.semesterStatus || {});
      }
      if (supabaseAvailable) {
        loadFromDb(user);
      }
    }
  }, [user, supabaseAvailable, loadFromDb]);

  function saveUserData() {
    if (!user) return;
    const key = `grades_${user}`;
    localStorage.setItem(key, JSON.stringify({
      grades, electiveSelections, ucSelections, ueSelections,
      completedCourses, semesterStatus
    }));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (supabaseAvailable) {
        saveStudentData(user, grades, ucSelections, ueSelections, electiveSelections);
      }
    }, 2000);
  }

  async function register(studentId, password) {
    if (!supabase) return "Supabase is not configured";
    const { data, error } = await registerStudent(studentId, password);
    if (error) {
      setSupabaseAvailable(false);
      setUser(studentId);
      setSelectedProgram(null);
      setSelectedTrack(null);
      setLoginError("");
      return null;
    }
    setUser(studentId);
    setSelectedProgram(null);
    setSelectedTrack(null);
    setLoginError("");
    return null;
  }

  async function login(userId, password) {
    if (supabaseAvailable && !userId.startsWith("admin_")) {
      const { data, error } = await loginStudent(userId, password);
      if (error || !data) {
        if (error) {
          setSupabaseAvailable(false);
          setUser(userId);
          setSelectedProgram(null);
          setSelectedTrack(null);
          setLoginError("");
          return;
        }
        setLoginError("Invalid ID or password");
        return;
      }
    }
    setUser(userId);
    setSelectedProgram(null);
    setSelectedTrack(null);
    setLoginError("");
  }

  async function loadAllStudents() {
    if (!supabaseAvailable) return;
    const list = await getAllStudents();
    setAllStudents(list);
  }

  async function viewStudentDetails(studentId) {
    if (!supabaseAvailable) return;
    const details = await getStudentDetails(studentId);
    setStudentDetails({ studentId, ...details });
  }

  async function removeStudent(studentId) {
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
  }

  function logout() {
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
    const updated = { ...grades, [code]: grade };
    setGrades(updated);
  }

  function selectElective(slot, courseCode) {
    setElectiveSelections(prev => ({ ...prev, [slot]: courseCode }));
  }

  function selectUC(slot, courseCode) {
    setUcSelections(prev => ({ ...prev, [slot]: courseCode }));
  }

  function selectUE(slot, courseCode) {
    setUeSelections(prev => ({ ...prev, [slot]: courseCode }));
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
    return prog.tracks[selectedTrack] || null;
  }

  function calcSemesterGPA(semCourses) {
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
    return total - completed;
  }

  function getUcPool() { return ucPool; }
  function getUePool() { return uePool; }

  function addToUcPool(course) {
    if (!ucPool.find(c => c.code === course.code)) {
      setUcPool(prev => [...prev, course]);
      if (supabaseAvailable) {
        saveAdminData("uc_pool", { slot: ucPool.length + 1, code: course.code, name: course.name });
      }
    }
  }
  function removeFromUcPool(code) {
    setUcPool(prev => prev.filter(c => c.code !== code));
    if (supabaseAvailable) {
      supabase.from("uc_pool").delete().eq("code", code);
    }
  }
  function updateUcPool(code, field, value) {
    setUcPool(prev => prev.map(c => c.code === code ? { ...c, [field]: value } : c));
  }

  function addToUePool(course) {
    if (!uePool.find(c => c.code === course.code)) {
      setUePool(prev => [...prev, course]);
      if (supabaseAvailable) {
        saveAdminData("ue_pool", { slot: uePool.length + 1, code: course.code, name: course.name });
      }
    }
  }
  function removeFromUePool(code) {
    setUePool(prev => prev.filter(c => c.code !== code));
    if (supabaseAvailable) {
      supabase.from("ue_pool").delete().eq("code", code);
    }
  }
  function updateUePool(code, field, value) {
    setUePool(prev => prev.map(c => c.code === code ? { ...c, [field]: value } : c));
  }

  function addPrereq(courseCode, prereqCode) {
    if (!prereqCode || !courseCode) return;
    setPrereqData(prev => {
      const existing = prev[courseCode] || [];
      if (existing.includes(prereqCode)) return prev;
      if (supabaseAvailable) {
        saveAdminData("prerequisite", { course: courseCode, prerequisite: prereqCode });
      }
      return { ...prev, [courseCode]: [...existing, prereqCode] };
    });
  }

  function removePrereq(courseCode, prereqCode) {
    setPrereqData(prev => {
      const list = prev[courseCode] || [];
      if (supabaseAvailable) {
        saveAdminData("remove_prerequisite", { course: courseCode, prerequisite: prereqCode });
      }
      return { ...prev, [courseCode]: list.filter(p => p !== prereqCode) };
    });
  }

  function getPrereqData() { return prereqData; }

  return (
    <AppContext.Provider value={{
      user, adminAccount, setAdminAccount,
      login, register, logout, loginError,
      selectedProgram, setSelectedProgram,
      selectedTrack, setSelectedTrack,
      programs, courses,
      grades, getGrade, setGrade, saveUserData,
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
