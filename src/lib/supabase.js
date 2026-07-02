import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables missing. App will fall back to localStorage.");
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ========== STUDENT AUTH ==========

export async function registerStudent(studentId, password) {
  try {
    if (!supabase) return { error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("students")
      .insert({ student_id: studentId, password })
      .select()
      .single();
    return { data, error };
  } catch (e) {
    return { error: e };
  }
}

export async function loginStudent(studentId, password) {
  try {
    if (!supabase) return { error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", studentId)
      .eq("password", password)
      .maybeSingle();
    if (data) {
      await supabase
        .from("students")
        .update({ last_login: new Date().toISOString() })
        .eq("student_id", studentId);
    }
    return { data, error };
  } catch (e) {
    return { error: e };
  }
}

export async function getAllStudents() {
  try {
    if (!supabase) return [];
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

// ========== STUDENT DATA ==========

export async function loadStudentData(studentId) {
  try {
    if (!supabase || !studentId) return null;

    const results = await Promise.allSettled([
      supabase.from("grades").select("course_code, grade").eq("student_id", studentId),
      supabase.from("uc_selections").select("slot, course_code").eq("student_id", studentId),
      supabase.from("ue_selections").select("slot, course_code").eq("student_id", studentId),
      supabase.from("elective_selections").select("slot, course_code").eq("student_id", studentId),
    ]);

    const getData = (result) => result.status === "fulfilled" ? result.value.data : null;
    const getError = (result) => result.status === "fulfilled" ? result.value.error : result.reason;

    return {
      grades: getData(results[0]) ? Object.fromEntries(getData(results[0]).map(r => [r.course_code, r.grade])) : null,
      ucSlots: getData(results[1]) ? Object.fromEntries(getData(results[1]).map(r => [r.slot, r.course_code])) : null,
      ueSlots: getData(results[2]) ? Object.fromEntries(getData(results[2]).map(r => [r.slot, r.course_code])) : null,
      electiveSelections: getData(results[3]) ? Object.fromEntries(getData(results[3]).map(r => [r.slot, r.course_code])) : null,
      error: getError(results[0]) || getError(results[1]) || getError(results[2]) || getError(results[3]),
    };
  } catch (e) {
    console.error("loadStudentData failed:", e);
    return null;
  }
}

export async function saveStudentData(studentId, grades, ucSlots, ueSlots, electiveSelections) {
  try {
    if (!supabase || !studentId) return { error: "Supabase not configured" };

    const gradeEntries = Object.entries(grades || {}).map(([course_code, grade]) => ({
      student_id: studentId, course_code, grade,
    }));

    const ucEntries = Object.entries(ucSlots || {})
      .filter(([, code]) => code)
      .map(([slot, course_code]) => ({ student_id: studentId, slot, course_code }));

    const ueEntries = Object.entries(ueSlots || {})
      .filter(([, code]) => code)
      .map(([slot, course_code]) => ({ student_id: studentId, slot, course_code }));

    const electEntries = Object.entries(electiveSelections || {})
      .filter(([, code]) => code)
      .map(([slot, course_code]) => ({ student_id: studentId, slot, course_code }));

    const ops = [];

    if (gradeEntries.length > 0) {
      ops.push(
        supabase.from("grades").upsert(gradeEntries, { onConflict: "student_id, course_code" }).select()
      );
    }
    if (ucEntries.length > 0) {
      const { error: delErr } = await supabase.from("uc_selections").delete().eq("student_id", studentId);
      if (!delErr) {
        const { error: insErr } = await supabase.from("uc_selections").insert(ucEntries);
        if (insErr) return { error: insErr };
      } else { return { error: delErr }; }
    }
    if (ueEntries.length > 0) {
      const { error: delErr } = await supabase.from("ue_selections").delete().eq("student_id", studentId);
      if (!delErr) {
        const { error: insErr } = await supabase.from("ue_selections").insert(ueEntries);
        if (insErr) return { error: insErr };
      } else { return { error: delErr }; }
    }
    if (electEntries.length > 0) {
      const { error: delErr } = await supabase.from("elective_selections").delete().eq("student_id", studentId);
      if (!delErr) {
        const { error: insErr } = await supabase.from("elective_selections").insert(electEntries);
        if (insErr) return { error: insErr };
      } else { return { error: delErr }; }
    }

    const results = await Promise.all(ops);
    const error = results.find(r => r?.error)?.error;
    return { error };
  } catch (e) {
    return { error: e };
  }
}

// ========== ADMIN ==========

export async function loadAdminData() {
  try {
    if (!supabase) return null;
    const results = await Promise.allSettled([
      supabase.from("admin_account").select("*").maybeSingle(),
      supabase.from("prerequisites").select("course, prerequisite"),
      supabase.from("course_overrides").select("*"),
      supabase.from("uc_pool").select("*").order("slot"),
      supabase.from("ue_pool").select("*").order("slot"),
    ]);
    const get = (i) => results[i].status === "fulfilled" ? results[i].value : { data: null, error: results[i].reason };
    return {
      admin: get(0).data,
      prereqs: get(1).data,
      overrides: get(2).data,
      ucPool: get(3).data,
      uePool: get(4).data,
      error: get(0).error || get(1).error || get(2).error || get(3).error || get(4).error,
    };
  } catch (e) {
    console.error("loadAdminData failed:", e);
    return null;
  }
}

export async function getStudentDetails(studentId) {
  try {
    if (!supabase) return null;
    const results = await Promise.allSettled([
      supabase.from("grades").select("*").eq("student_id", studentId),
      supabase.from("uc_selections").select("*").eq("student_id", studentId),
      supabase.from("ue_selections").select("*").eq("student_id", studentId),
      supabase.from("elective_selections").select("*").eq("student_id", studentId),
    ]);
    const get = (i) => results[i].status === "fulfilled" ? (results[i].value.data || []) : [];
    return {
      grades: get(0),
      ucSelections: get(1),
      ueSelections: get(2),
      electiveSelections: get(3),
    };
  } catch (e) {
    console.error("getStudentDetails failed:", e);
    return null;
  }
}

export async function deleteStudentAccount(studentId) {
  try {
    if (!supabase) return { error: "Supabase not configured" };
    const results = await Promise.allSettled([
      supabase.from("grades").delete().eq("student_id", studentId),
      supabase.from("uc_selections").delete().eq("student_id", studentId),
      supabase.from("ue_selections").delete().eq("student_id", studentId),
      supabase.from("elective_selections").delete().eq("student_id", studentId),
      supabase.from("students").delete().eq("student_id", studentId),
    ]);
    const err = results.find(r => r.status === "rejected" || r.value?.error);
    return { error: err ? (err.reason || err.value?.error) : null };
  } catch (e) {
    return { error: e };
  }
}

export async function saveAdminData(type, data) {
  try {
    if (!supabase) return { error: "Supabase not configured" };
    switch (type) {
      case "admin_account":
        return supabase.from("admin_account").upsert(data, { onConflict: "id" }).select().maybeSingle();
      case "prerequisite":
        return supabase.from("prerequisites").insert(data).select().single();
      case "remove_prerequisite":
        return supabase.from("prerequisites").delete().eq("course", data.course).eq("prerequisite", data.prerequisite);
      case "course_override":
        return supabase.from("course_overrides").upsert(data, { onConflict: "code" }).select().single();
      case "uc_pool":
        return supabase.from("uc_pool").upsert(data, { onConflict: "slot" }).select().single();
      case "ue_pool":
        return supabase.from("ue_pool").upsert(data, { onConflict: "slot" }).select().single();
      default:
        return { error: `Unknown type: ${type}` };
    }
  } catch (e) {
    return { error: e };
  }
}
