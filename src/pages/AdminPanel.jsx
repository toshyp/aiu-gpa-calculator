import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "../components/Toast";
import courses from "../data/courses";
import programs from "../data/programs";
import { Save, LogOut, BookOpen, GitBranch, Shield, List, Plus, Trash2, X, Users, ChevronDown, ChevronRight } from "lucide-react";

export default function AdminPanel() {
  const {
    user, logout, adminAccount, setAdminAccount,
    ucPool, uePool,
    addToUcPool, removeFromUcPool, updateUcPool,
    addToUePool, removeFromUePool, updateUePool,
    prereqData, addPrereq, removePrereq,
    courseOverrides, setCourseOverrides, getCourseName,
    courses: allCourses,
    allStudents, loadAllStudents,
    studentDetails, setStudentDetails, viewStudentDetails,
    removeStudent,
  } = useApp();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("courses");
  const [editCourse, setEditCourse] = useState(null);
  const [editPrereq, setEditPrereq] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [saved, setSaved] = useState(false);
  const [newUcCode, setNewUcCode] = useState("");
  const [newUcName, setNewUcName] = useState("");
  const [newUeCode, setNewUeCode] = useState("");
  const [newUeName, setNewUeName] = useState("");
  const [prereqCourse, setPrereqCourse] = useState("");
  const [prereqValue, setPrereqValue] = useState("");

  function handleSave() {
    setSaved(true);
    toast("Changes saved!");
    setTimeout(() => setSaved(false), 2000);
  }

  useEffect(() => {
    if (activeTab === "students") loadAllStudents();
  }, [activeTab, loadAllStudents]);

  const filteredCourses = Object.values(courses).filter(c =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || !user.startsWith("admin_")) {
    return <div style={{ color: "white", padding: "40px", textAlign: "center" }}>Access Denied</div>;
  }

  const tabStyle = (tab) => ({
    padding: "10px 20px", border: "none", borderRadius: "8px", cursor: "pointer",
    fontSize: "14px", fontWeight: 600,
    background: activeTab === tab ? "#3b82f6" : "rgba(255,255,255,0.05)",
    color: activeTab === tab ? "white" : "#64748b",
    display: "flex", alignItems: "center", gap: "8px"
  });

  return (
    <div className="page-wrapper" style={{ minHeight: "100vh", background: "#0f172a" }}>
      <div className="admin-panel" style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px" }}>
        {/* Admin Header */}
        <div className="admin-header" style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "24px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Shield size={28} color="#8b5cf6" />
            <div>
              <h1 style={{ color: "white", fontSize: "20px", margin: 0 }}>Admin Panel</h1>
              <p style={{ color: "#64748b", fontSize: "13px", margin: "2px 0 0" }}>
                Manage courses, prerequisites & programs
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {saved && <span style={{ color: "#22c55e", fontSize: "13px", alignSelf: "center" }}>Saved ✓</span>}
            <button onClick={handleSave}
              style={{
                padding: "10px 20px", border: "none", borderRadius: "10px",
                background: "#3b82f6", color: "white", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px", fontSize: "14px"
              }}><Save size={16} /> Save Changes</button>
            <button onClick={logout} style={{
              padding: "10px", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "10px", background: "transparent", color: "#94a3b8", cursor: "pointer"
            }}><LogOut size={16} /></button>
          </div>
        </div>

        {/* Stats Cards */}
        {allStudents.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px", marginBottom: "20px"
          }}>
          {[
            { label: "Total Students", value: allStudents.length, color: "#3b82f6" },
            { label: "Registered Today", value: allStudents.filter(s => s.created_at && new Date(s.created_at).toDateString() === new Date().toDateString()).length, color: "#22c55e" },
            { label: "Last 24h", value: allStudents.filter(s => s.created_at && Date.now() - new Date(s.created_at).getTime() < 86400000).length, color: "#8b5cf6" },
            ].map(card => (
              <div key={card.label} style={{
                background: `linear-gradient(135deg, ${card.color}08, ${card.color}03)`,
                borderRadius: "14px", padding: "16px 20px",
                border: `1px solid ${card.color}15`
              }}>
                <p style={{ color: "#64748b", fontSize: "11px", margin: "0 0 6px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {card.label}
                </p>
                <p style={{ color: card.color, fontSize: "26px", fontWeight: 700, margin: 0 }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="admin-tabs-wrapper" style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          <button style={tabStyle("courses")} onClick={() => setActiveTab("courses")}>
            <BookOpen size={16} /> Courses
          </button>
          <button style={tabStyle("prerequisites")} onClick={() => setActiveTab("prerequisites")}>
            <GitBranch size={16} /> Prerequisites
          </button>
          <button style={tabStyle("programs")} onClick={() => setActiveTab("programs")}>
            <BookOpen size={16} /> Programs
          </button>
          <button style={tabStyle("pools")} onClick={() => setActiveTab("pools")}>
            <List size={16} /> Pools (UC/UE)
          </button>
          <button style={tabStyle("students")} onClick={() => setActiveTab("students")}>
            <Users size={16} /> Students
          </button>
          <button style={tabStyle("account")} onClick={() => setActiveTab("account")}>
            <Shield size={16} /> Account
          </button>
        </div>

        {/* Courses Tab */}
        {activeTab === "courses" && (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <input
                type="text" placeholder="Search courses..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: "100%", padding: "12px 16px", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px", background: "rgba(255,255,255,0.05)",
                  color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
            <div className="admin-grid-scroll" style={{
              background: "rgba(255,255,255,0.03)", borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden"
            }}>
              <div className="admin-grid-scroll-inner" style={{
                display: "grid", gridTemplateColumns: "100px 1fr 80px",
                padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
                color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase"
              }}>
                <span>Code</span>
                <span>Course Name</span>
                <span>Credits</span>
              </div>
              {filteredCourses.map(c => (
                <div key={c.code} style={{
                  display: "grid", gridTemplateColumns: "100px 1fr 80px",
                  padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
                  alignItems: "center"
                }}>
                  <span style={{ color: "#3b82f6", fontSize: "13px", fontWeight: 600 }}>{c.code}</span>
                  <input value={getCourseName(c.code)}
                    onChange={e => setCourseOverrides(prev => ({ ...prev, [c.code]: { ...prev[c.code], name: e.target.value } }))}
                    style={{
                      padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.05)", color: "white", fontSize: "13px", width: "100%", boxSizing: "border-box"
                    }} />
                  <input
                    type="number" value={courseOverrides[c.code]?.credits !== undefined ? courseOverrides[c.code].credits : c.credits}
                    onChange={e => {
                      const v = parseInt(e.target.value) || 0;
                      setCourseOverrides(prev => ({ ...prev, [c.code]: { ...prev[c.code], credits: Math.max(0, v) } }));
                    }}
                    style={{
                      width: "60px", padding: "4px 8px", borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.05)", color: "white", fontSize: "13px",
                      textAlign: "center"
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prerequisites Tab */}
        {activeTab === "prerequisites" && (
          <div style={{
            background: "rgba(255,255,255,0.03)", borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: "16px"
          }}>
          <div style={{
            display: "grid", gridTemplateColumns: "100px 1fr",
            padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
            color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase"
          }}>
            <span>Course</span>
            <span>Prerequisites</span>
          </div>
          {Object.entries(prereqData).sort().map(([code, prereqs]) => (
            <div key={code} style={{
              display: "grid", gridTemplateColumns: "100px 1fr",
              padding: "6px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              alignItems: "start"
            }}>
                <span style={{ color: "#3b82f6", fontSize: "13px", fontWeight: 600, paddingTop: "4px" }}>{code}</span>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", paddingTop: "4px" }}>
                  {prereqs.length === 0 && (
                    <span style={{ color: "#475569", fontSize: "11px", fontStyle: "italic" }}>None</span>
                  )}
                  {prereqs.map(p => (
                    <span key={p} style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "2px 8px", borderRadius: "6px", fontSize: "11px",
                      background: p === "SENIOR_STANDING" ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)",
                      color: p === "SENIOR_STANDING" ? "#f59e0b" : "#3b82f6"
                    }}>
                      {p}
                      <button onClick={() => removePrereq(code, p)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0, display: "flex", fontSize: "11px" }}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Prerequisite */}
        {activeTab === "prerequisites" && (
          <div style={{
            background: "rgba(255,255,255,0.03)", borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)", padding: "16px 20px"
          }}>
            <h3 style={{ color: "white", fontSize: "14px", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Plus size={16} color="#3b82f6" /> Add / Edit Prerequisite
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ color: "#64748b", fontSize: "11px", display: "block", marginBottom: "4px" }}>Course Code</label>
                <input placeholder="e.g. CSE494" value={prereqCourse}
                  onChange={e => setPrereqCourse(e.target.value.toUpperCase())}
                  list="courseCodes"
                  style={{ width: "120px", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ color: "#64748b", fontSize: "11px", display: "block", marginBottom: "4px" }}>Prerequisite Code</label>
                <input placeholder="e.g. CSE493" value={prereqValue}
                  onChange={e => setPrereqValue(e.target.value.toUpperCase())}
                  list="prereqCodes"
                  style={{ width: "120px", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "13px" }} />
              </div>
              <button onClick={() => {
                if (prereqCourse.trim() && prereqValue.trim()) {
                  addPrereq(prereqCourse.trim(), prereqValue.trim());
                  setPrereqValue("");
                }
              }} style={{ padding: "6px 16px", border: "none", borderRadius: "8px", background: "#3b82f6", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                <Plus size={14} /> Add
              </button>
            </div>
            <datalist id="courseCodes">
              {Object.keys(courses).map(c => <option key={c} value={c} />)}
            </datalist>
            <datalist id="prereqCodes">
              {Object.keys(courses).map(c => <option key={c} value={c} />)}
              <option value="SENIOR_STANDING" />
            </datalist>
            <p style={{ color: "#475569", fontSize: "11px", margin: "8px 0 0" }}>
              Tip: Use <strong style={{ color: "#f59e0b" }}>SENIOR_STANDING</strong> for courses that require senior year status.
            </p>
          </div>
        )}

        {/* Programs Tab */}
        {activeTab === "programs" && (
          <div style={{
            background: "rgba(255,255,255,0.03)", borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden"
          }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 80px 60px",
              padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
              color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase"
            }}>
              <span>Program</span>
              <span>Credits</span>
              <span>Tracks</span>
            </div>
            {Object.values(programs).map(p => (
              <div key={p.id} style={{
                padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 60px",
                  alignItems: "center"
                }}>
                  <div>
                    <p style={{ color: "white", fontSize: "14px", margin: 0, fontWeight: 500 }}>{p.name}</p>
                    <p style={{ color: "#64748b", fontSize: "12px", margin: "2px 0 0" }}>{p.department}</p>
                  </div>
                  <span style={{ color: "#3b82f6", fontSize: "14px", fontWeight: 600 }}>{p.totalCredits}</span>
                  <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                    {p.hasTracks && p.tracks ? Object.keys(p.tracks).length : "—"}
                  </span>
                </div>
                {p.hasTracks && p.tracks && (
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    {Object.values(p.tracks).map(t => (
                      <span key={t.id} style={{
                        padding: "2px 10px", borderRadius: "6px", fontSize: "11px",
                        background: "rgba(6,182,212,0.1)", color: "#06b6d4"
                      }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pools Tab */}
        {activeTab === "pools" && (
          <div>
            {/* UC Pool */}
            <h3 style={{ color: "white", fontSize: "16px", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={18} color="#8b5cf6" /> University Requirements Pool (UC)
              <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 400 }}>(2 CH each)</span>
            </h3>
            <div className="admin-grid-scroll" style={{
              background: "rgba(255,255,255,0.03)", borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: "24px"
            }}>
              <div className="admin-grid-scroll-inner" style={{
                display: "grid", gridTemplateColumns: "100px 1fr 80px 50px",
                padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
                color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase"
              }}>
                <span>Code</span>
                <span>Course Name</span>
                <span>Credits</span>
                <span></span>
              </div>
              {ucPool.map(c => (
                <div key={c.code} style={{
                  display: "grid", gridTemplateColumns: "100px 1fr 80px 50px",
                  padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
                  alignItems: "center"
                }}>
                  <input value={c.code} onChange={e => updateUcPool(c.code, "code", e.target.value)}
                    style={{ width: "90px", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#3b82f6", fontSize: "13px", fontWeight: 600 }} />
                  <input value={c.name} onChange={e => updateUcPool(c.code, "name", e.target.value)}
                    style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "13px" }} />
                  <span style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center" }}>2</span>
                  <button onClick={() => removeFromUcPool(c.code)}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {/* Add new UC */}
              <div style={{ padding: "12px 20px", display: "flex", gap: "8px" }}>
                <input placeholder="Code" value={newUcCode} onChange={e => setNewUcCode(e.target.value)}
                  style={{ width: "100px", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "13px" }} />
                <input placeholder="Course Name" value={newUcName} onChange={e => setNewUcName(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "13px" }} />
                <button onClick={() => {
                  const code = newUcCode.trim();
                  const name = newUcName.trim();
                  if (code && name) { addToUcPool({ code, name }); setNewUcCode(""); setNewUcName(""); }
                }} style={{ padding: "6px 16px", border: "none", borderRadius: "8px", background: "#3b82f6", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* UE Pool */}
            <h3 style={{ color: "white", fontSize: "16px", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={18} color="#ec4899" /> University Elective Pool (UE)
              <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 400 }}>(2 CH each)</span>
            </h3>
            <div className="admin-grid-scroll" style={{
              background: "rgba(255,255,255,0.03)", borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: "24px"
            }}>
              <div className="admin-grid-scroll-inner" style={{
                display: "grid", gridTemplateColumns: "100px 1fr 80px 50px",
                padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
                color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase"
              }}>
                <span>Code</span>
                <span>Course Name</span>
                <span>Credits</span>
                <span></span>
              </div>
              {uePool.map(c => (
                <div key={c.code} style={{
                  display: "grid", gridTemplateColumns: "100px 1fr 80px 50px",
                  padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
                  alignItems: "center"
                }}>
                  <input value={c.code} onChange={e => updateUePool(c.code, "code", e.target.value)}
                    style={{ width: "90px", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#ec4899", fontSize: "13px", fontWeight: 600 }} />
                  <input value={c.name} onChange={e => updateUePool(c.code, "name", e.target.value)}
                    style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "13px" }} />
                  <span style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center" }}>2</span>
                  <button onClick={() => removeFromUePool(c.code)}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {/* Add new UE */}
              <div style={{ padding: "12px 20px", display: "flex", gap: "8px" }}>
                <input placeholder="Code" value={newUeCode} onChange={e => setNewUeCode(e.target.value)}
                  style={{ width: "100px", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "13px" }} />
                <input placeholder="Course Name" value={newUeName} onChange={e => setNewUeName(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "13px" }} />
                <button onClick={() => {
                  const code = newUeCode.trim();
                  const name = newUeName.trim();
                  if (code && name) { addToUePool({ code, name }); setNewUeCode(""); setNewUeName(""); }
                }} style={{ padding: "6px 16px", border: "none", borderRadius: "8px", background: "#ec4899", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <div>
            <div className="admin-grid-scroll" style={{
              background: "rgba(255,255,255,0.03)", borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: "16px"
            }}>
              <div className="admin-grid-scroll-inner" style={{
                display: "grid", gridTemplateColumns: "120px 1fr 180px 100px",
                padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
                color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase"
              }}>
                <span>Student ID</span>
                <span>Registered</span>
                <span>Last Login</span>
                <span></span>
              </div>
              {allStudents.length === 0 && (
                <div style={{ padding: "24px 20px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
                  No registered students yet.
                </div>
              )}
              {allStudents.map(s => (
                <div key={s.student_id}>
                  <div style={{
                    display: "grid", gridTemplateColumns: "120px 1fr 180px 100px",
                    padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
                    alignItems: "center"
                  }}>
                    <span style={{ color: "#3b82f6", fontSize: "13px", fontWeight: 600 }}>{s.student_id}</span>
                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                      {s.created_at ? new Date(s.created_at).toLocaleString() : "—"}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                      {s.last_login ? new Date(s.last_login).toLocaleString() : "Never"}
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => viewStudentDetails(s.student_id)}
                        style={{
                          padding: "4px 10px", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "6px",
                          background: "rgba(59,130,246,0.1)", color: "#3b82f6", cursor: "pointer",
                          fontSize: "11px", display: "flex", alignItems: "center", gap: "4px"
                        }}>
                        {studentDetails?.studentId === s.student_id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        View
                      </button>
                      <button onClick={async () => {
                        if (window.confirm(`Delete student ${s.student_id} and all their data?`)) {
                          await removeStudent(s.student_id);
                        }
                      }}
                        style={{
                          padding: "4px 10px", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px",
                          background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer",
                          fontSize: "11px"
                        }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  {studentDetails?.studentId === s.student_id && (
                    <div style={{
                      padding: "16px 20px 16px 40px",
                      background: "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid rgba(255,255,255,0.05)"
                    }}>
                      <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}>
                        Grades ({studentDetails.grades.length}):
                      </div>
                      {studentDetails.grades.length === 0 ? (
                        <span style={{ color: "#475569", fontSize: "11px", fontStyle: "italic" }}>No grades recorded</span>
                      ) : (
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
                          {studentDetails.grades.map(g => (
                            <span key={g.course_code} style={{
                              padding: "2px 8px", borderRadius: "6px", fontSize: "11px",
                              background: "rgba(59,130,246,0.1)", color: "#3b82f6"
                            }}>
                              {g.course_code}: {g.grade}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}>
                        UC Selections ({studentDetails.ucSelections.length}):
                      </div>
                      {studentDetails.ucSelections.length === 0 ? (
                        <span style={{ color: "#475569", fontSize: "11px", fontStyle: "italic" }}>None</span>
                      ) : (
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
                          {studentDetails.ucSelections.map(s => (
                            <span key={s.slot} style={{
                              padding: "2px 8px", borderRadius: "6px", fontSize: "11px",
                              background: "rgba(139,92,246,0.1)", color: "#8b5cf6"
                            }}>
                              Slot {s.slot}: {s.course_code}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}>
                        UE Selections ({studentDetails.ueSelections.length}):
                      </div>
                      {studentDetails.ueSelections.length === 0 ? (
                        <span style={{ color: "#475569", fontSize: "11px", fontStyle: "italic" }}>None</span>
                      ) : (
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {studentDetails.ueSelections.map(s => (
                            <span key={s.slot} style={{
                              padding: "2px 8px", borderRadius: "6px", fontSize: "11px",
                              background: "rgba(236,72,153,0.1)", color: "#ec4899"
                            }}>
                              Slot {s.slot}: {s.course_code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <div style={{
            maxWidth: "400px", margin: "0 auto",
            background: "rgba(255,255,255,0.03)", borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)", padding: "24px"
          }}>
            <h3 style={{ color: "white", fontSize: "16px", margin: "0 0 16px" }}>
              Admin Account Settings
            </h3>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#94a3b8", fontSize: "13px", display: "block", marginBottom: "6px" }}>
                Username
              </label>
              <input
                type="text" value={adminAccount.username}
                onChange={e => setAdminAccount({ ...adminAccount, username: e.target.value })}
                style={{
                  width: "100%", padding: "10px 14px", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px", background: "rgba(255,255,255,0.05)",
                  color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#94a3b8", fontSize: "13px", display: "block", marginBottom: "6px" }}>
                Password
              </label>
              <input
                type="password" value={adminAccount.password}
                onChange={e => setAdminAccount({ ...adminAccount, password: e.target.value })}
                style={{
                  width: "100%", padding: "10px 14px", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px", background: "rgba(255,255,255,0.05)",
                  color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "24px 0", color: "#334155", fontSize: "12px" }}>
          Admin Panel — AIU GPA Calculator
        </div>
      </div>
    </div>
  );
}
