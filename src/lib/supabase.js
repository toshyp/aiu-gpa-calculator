import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase environment variables missing. App will fall back to localStorage."
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function loadStudentData(studentId) {
  if (!supabase || !studentId) return null;

  const [gradesRes, ucRes, ueRes] = await Promise.all([
    supabase
      .from("grades")
      .select("course_code, grade")
      .eq("student_id", studentId),
    supabase
      .from("uc_selections")
      .select("slot, course_code")
      .eq("student_id", studentId),
    supabase
      .from("ue_selections")
      .select("slot, course_code")
      .eq("student_id", studentId),
  ]);

  return {
    grades: gradesRes.data
      ? Object.fromEntries(
          gradesRes.data.map((r) => [r.course_code, r.grade])
        )
      : null,
    ucSlots: ucRes.data
      ? Object.fromEntries(ucRes.data.map((r) => [r.slot, r.course_code]))
      : null,
    ueSlots: ueRes.data
      ? Object.fromEntries(ueRes.data.map((r) => [r.slot, r.course_code]))
      : null,
    error: gradesRes.error || ucRes.error || ueRes.error,
  };
}

export async function saveStudentData(studentId, grades, ucSlots, ueSlots) {
  if (!supabase || !studentId) return { error: "Supabase not configured" };

  const gradeEntries = Object.entries(grades || {}).map(
    ([course_code, grade]) => ({
      student_id: studentId,
      course_code,
      grade,
    })
  );

  const ucEntries = Object.entries(ucSlots || {})
    .filter(([, code]) => code)
    .map(([slot, course_code]) => ({
      student_id: studentId,
      slot: Number(slot),
      course_code,
    }));

  const ueEntries = Object.entries(ueSlots || {})
    .filter(([, code]) => code)
    .map(([slot, course_code]) => ({
      student_id: studentId,
      slot: Number(slot),
      course_code,
    }));

  const ops = [];

  if (gradeEntries.length > 0) {
    ops.push(
      supabase
        .from("grades")
        .upsert(gradeEntries, {
          onConflict: "student_id, course_code",
          ignoreDuplicates: false,
        })
        .select()
        .then((r) => ({ key: "grades", ...r }))
    );
  }

  if (ucEntries.length > 0) {
    ops.push(
      supabase
        .from("uc_selections")
        .delete()
        .eq("student_id", studentId)
        .then(() =>
          supabase.from("uc_selections").insert(ucEntries).select()
        )
        .then((r) => ({ key: "uc_selections", ...r }))
    );
  }

  if (ueEntries.length > 0) {
    ops.push(
      supabase
        .from("ue_selections")
        .delete()
        .eq("student_id", studentId)
        .then(() =>
          supabase.from("ue_selections").insert(ueEntries).select()
        )
        .then((r) => ({ key: "ue_selections", ...r }))
    );
  }

  const results = await Promise.all(ops);
  const error = results.find((r) => r.error)?.error;
  return { error };
}

export async function loadAdminData() {
  if (!supabase) return null;

  const [adminRes, prereqsRes, overridesRes, ucPoolRes, uePoolRes] =
    await Promise.all([
      supabase.from("admin_account").select("*").maybeSingle(),
      supabase.from("prerequisites").select("course, prerequisite"),
      supabase.from("course_overrides").select("*"),
      supabase.from("uc_pool").select("*").order("slot"),
      supabase.from("ue_pool").select("*").order("slot"),
    ]);

  return {
    admin: adminRes.data,
    prereqs: prereqsRes.data,
    overrides: overridesRes.data,
    ucPool: ucPoolRes.data,
    uePool: uePoolRes.data,
    error:
      adminRes.error ||
      prereqsRes.error ||
      overridesRes.error ||
      ucPoolRes.error ||
      uePoolRes.error,
  };
}

export async function saveAdminData(type, data, studentId) {
  if (!supabase) return { error: "Supabase not configured" };

  switch (type) {
    case "admin_account":
      return supabase
        .from("admin_account")
        .upsert(data, { onConflict: "id" })
        .select()
        .maybeSingle();

    case "prerequisite":
      return supabase.from("prerequisites").insert(data).select().single();

    case "remove_prerequisite":
      return supabase
        .from("prerequisites")
        .delete()
        .eq("course", data.course)
        .eq("prerequisite", data.prerequisite);

    case "course_override":
      return supabase
        .from("course_overrides")
        .upsert(data, { onConflict: "code" })
        .select()
        .single();

    case "uc_pool":
      return supabase
        .from("uc_pool")
        .upsert(data, { onConflict: "slot" })
        .select()
        .single();

    case "ue_pool":
      return supabase
        .from("ue_pool")
        .upsert(data, { onConflict: "slot" })
        .select()
        .single();

    default:
      return { error: `Unknown type: ${type}` };
  }
}
