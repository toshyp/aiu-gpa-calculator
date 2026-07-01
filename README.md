# AIU GPA Calculator

> **Alamein International University — Faculty of Computer Science & Engineering**
> Student GPA tracking, grade entry, prerequisite enforcement, What-If analysis, and admin management system.

---

## 📌 Overview

A single-page React application that serves as the official GPA calculator for AIU's Faculty of Computer Science & Engineering. Students log in with any ID, select their program (and track if applicable), enter grades per course across all semesters, and see real-time GPA calculations. The app also includes a "What-If Analysis" tool, an admin panel for managing courses/prerequisites/pools, and optional Supabase cloud sync.

**Live Demo:** (deploy via Vercel)
**Status:** 22/22 E2E tests passing ✅

---

## 📚 Programs & Tracks (6 Programs, 7 Tracks)

### Computer Engineering (157 CR HRS, 10 semesters)
- Embedded Systems
- Cloud Computing
- High Performance Computing
- Cyber Security

### Computer Science (133 CR HRS, 8 semesters)
- Big Data Analytics
- Computer Vision
- Software Engineering

### AI Engineering (157 CR HRS, 10 semesters — no tracks)

### AI Science (133 CR HRS, 8 semesters — no tracks)

### Biomedical Informatics (133 CR HRS, 8 semesters — no tracks)

### Information Technology (132 CR HRS, 8 semesters — no tracks)

---

## 🧠 All Courses (≈140 courses)

Course data is in `src/data/courses.js`. Each course has: `code`, `name`, `credits`.

### CSE Courses (84 courses)
CSE011-CSE012, CSE014-CSE015, CSE081, CSE111-CSE113, CSE131-CSE132, CSE191-CSE192,
CSE211, CSE221, CSE232-CSE234, CSE241-CSE243, CSE251, CSE261-CSE262, CSE271-CSE272,
CSE281, CSE291-CSE293, CSE311-CSE315, CSE321-CSE325, CSE335, CSE344, CSE351-CSE353,
CSE361-CSE363, CSE373, CSE382-CSE383, CSE392, CSE411, CSE424-CSE427, CSE436,
CSE445-CSE448, CSE453-CSE455, CSE463-CSE468, CSE474-CSE476, CSE484-CSE488,
CSE493-CSE494

### AIE Courses (36 courses)
AIE111-AIE122, AIE191, AIE212-AIE213, AIE231, AIE241, AIE291-AIE292,
AIE314-AIE317, AIE322-AIE323, AIE332, AIE342-AIE343, AIE351, AIE392,
AIE417-AIE419, AIE424-AIE427, AIE444, AIE452-AIE457, AIE493-AIE494

### BMD Courses (20 courses)
BMD191, BMD241, BMD292, BMD310-BMD313, BMD320, BMD351, BMD361,
BMD413-BMD415, BMD421-BMD422, BMD431, BMD452, BMD462, BMD493-BMD494

### Math & Science (10 courses)
MAT111-MAT112, MAT123, MAT131, MAT212, MAT231, MAT312, MAT315,
PHY211-PHY212, PHY281, BIO221, BIO241

### Engineering Foundation (2 courses)
MEC011 (Engineering Drawing 1), ELE432 (Digital Signal Processing)

### Business / IT (2 courses)
BIS251, BIS356

### University Requirement Pool (UC — 2 CH each)
GEO217, LAN111, LAN120, LAN112, MGT222, AN114, LIB116, MGT201, MGT102,
MEC013, SOC107, PSC207, LAN170A, LAN170B

### External Electives (3 CH each — from other departments)
CHE142 (Engineering Chemistry), MAT121 (Dynamics), MAT122 (Statics),
ELE115 (Electrical Circuits), ELE215 (Electronics), ELE232 (Communication Systems),
ELE233 (Control Systems), ELE338 (Wireless Networks), ELE113 (Electrical Drawing),
BIO131 (Biology I), BIS452 (Integrated Information Systems)

### Credit Hours Summary
- **Most courses:** 3 CH
- **University Requirement pools (UC/UE):** 2 CH
- **Field Training courses:** 2 CH
- **Graduation Projects:** 3 CH each
- CSE011 (Computer Skills): 0 CH

---

## 🔗 Prerequisites System

Defined in `src/data/prerequisites.js` (≈120 entries). Each course maps to an array of prerequisite course codes. Special:
- `SENIOR_STANDING` — virtual prereq for graduation projects (CSE493, AIE493, BMD493)
- Prerequisites are checked in the UI with a warning icon (⚠️) when missing or failed (F grade)
- Admin can add/remove prerequisites dynamically

Examples: CSE015 → CSE014, CSE111 → CSE015, CSE112 → CSE111, CSE493 → SENIOR_STANDING

---

## 🎓 Grade Scale (GPA out of 4.0)

| Grade | Points | Grade | Points | Grade | Points |
|-------|--------|-------|--------|-------|--------|
| A+    | 4.0    | B     | 3.0    | D+    | 1.3    |
| A     | 4.0    | B-    | 2.7    | D     | 1.0    |
| A-    | 3.7    | C+    | 2.3    | D-    | 0.7    |
| B+    | 3.3    | C     | 2.0    | F     | 0.0    |
|       |        | C-    | 1.7    |       |        |

F grades correctly lower CGPA (0 points × credit hours).

---

## 🔧 What-If Analysis

Integrated directly in the Student Dashboard (toggle button "What-If Analysis: How to reach a target CGPA?").

**Two modes:**

1. **Grade Combination Solutions (achievable target):** User inputs planned credits + target CGPA. System generates 5–10 different grade-combination solutions (e.g., "A in 2 courses, B+ in 1 course" → new GPA). Shows best case, minimum uniform grade, and mixed strategies.

2. **Course Improvement Plans (unachievable target):** If target is not reachable with planned credits alone, system identifies specific courses the student has already taken, sorted worst-first. For each plan it shows: which courses to retake, what grade to aim for, credit hours used, and the resulting CGPA improvement percentage. Uses combinatorial search (single + multi-course combos up to 6 courses).

---

## 👤 Student Features

- **Login:** Any student ID (no password)
- **Program Selection:** 6 program cards with total CR HRS and department name
- **Track Selection:** If program has tracks, shows track cards with total CR HRS
- **Course Grid:** Semester-by-semester course tables with:
  - Course code + name
  - Credit hours (CH)
  - Type badges: CR (Core), TE (Tech Elective), UC (Univ Requirement), UE (Univ Elective), FT (Field Training), GP (Graduation Project)
  - ⚠️ Prerequisite warning icon
  - Dropdown selectors for elective/UC/UE course choice
  - Grade selector (A+ to F)
- **Summary Cards:** Total CR HRS, Completed, Remaining, CGPA (after clicking Calculate)
- **Save Button:** Persists grades + selections to localStorage under `grades_<studentId>`
- **Clear All:** Removes all grades for current student
- **What-If Analysis:** See above
- **Semester GPA Breakdown:** Per-semester GPA display
- **Completed Courses List:** All passed courses with grades and credit hours

---

## 🔐 Admin Features

Login: username `Ahmed`, password `3320`

### 5 Tabs:
1. **Courses** — Search and edit course names and credit hours (overrides stored in localStorage/Supabase)
2. **Prerequisites** — Add/remove prerequisite relationships between courses
3. **Pools** — Manage UC (University Requirement) and UE (University Elective) pools
4. **Programs** — View all program/track definitions and their semester structures (read-only)
5. **Account** — Change admin username/password

---

## 💾 Data Persistence

### localStorage (Primary)
- All data persists in browser localStorage
- Student grades: `grades_<studentId>` key
- Admin account: `adminAccount` key
- Course overrides: `aiuCourseOverrides` key
- Prerequisites: `aiuPrereqs` key
- Pools: `aiuPools` key

### Supabase (Optional — opt-in)
- When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables are set
- Syncs student grades, UC/UE selections, admin data to Supabase PostgreSQL
- Falls back gracefully to localStorage when env vars are missing
- **8 database tables:** `admin_account`, `prerequisites`, `course_overrides`, `uc_pool`, `ue_pool`, `grades`, `uc_selections`, `ue_selections`
- **RLS Policies:** Permissive (allow all) for simplicity with anon key
- **Schema file:** `supabase-schema.sql`

---

## 🏗️ Architecture

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite 8 |
| **State** | React Context (AppContext) |
| **Icons** | lucide-react |
| **Charts** | recharts (available, not currently used) |
| **Routing** | react-router-dom (available, not currently used — single-page app) |
| **Cloud DB** | Supabase (optional) |
| **Deployment** | Vercel (vite config) |
| **Testing** | Playwright + Chromium (22 E2E tests) |
| **Linting** | oxlint |

### File Structure
```
aiu-gpa-calculator/
├── index.html                # Entry HTML with global error handler
├── vite.config.js            # Vite + React plugin
├── vercel.json               # Vercel deployment config
├── package.json              # Dependencies & scripts
├── .env.example              # Supabase env vars template
├── supabase-schema.sql       # PostgreSQL schema for Supabase
├── e2e_test.mjs              # 22 Playwright E2E tests
├── public/
│   ├── favicon.svg           # Browser tab icon
│   └── icons.svg             # SVG icon library
└── src/
    ├── main.jsx              # App entry point
    ├── App.jsx               # Root component + ErrorBoundary
    ├── index.css             # Global styles
    ├── App.css               # App-level styles
    ├── context/
    │   └── AppContext.jsx     # All state management
    ├── data/
    │   ├── courses.js        # All course definitions
    │   ├── programs.js       # 6 programs + tracks + semesters
    │   ├── prerequisites.js  # Prerequisite graph
    │   └── gradeScale.js     # Grade → GPA mapping
    ├── pages/
    │   ├── LoginPage.jsx     # Student/Admin login
    │   ├── Dashboard.jsx     # Student dashboard (853 lines)
    │   └── AdminPanel.jsx    # Admin panel (457 lines)
    ├── lib/
    │   └── supabase.js       # Supabase client + CRUD helpers
    └── assets/               # Static assets
```

---

## 🚪 User Flow

```
[Login Page]
  ├── Student: Enter any ID → [Program Selection Screen]
  │     ├── Program with tracks → [Track Selection Screen] → [Course Dashboard]
  │     └── Program without tracks → [Course Dashboard]
  │
  └── Admin: Enter credentials (Ahmed/3320) → [Admin Panel]
        ├── Courses Tab
        ├── Prerequisites Tab
        ├── Pools Tab (UC/UE)
        ├── Programs Tab
        └── Account Tab
```

---

## ⚠️ Error Handling

- **ErrorBoundary** (class component in App.jsx): Catches React render errors and displays a styled error panel with reload button
- **Global Error Handler** (in index.html): `window.onerror` + `unhandledrejection` listeners show a full-screen overlay with error details
- Both ensure the app never shows a white screen of death

---

## 🧪 Testing (22 E2E Tests)

All tests use Playwright with headless Chromium, isolated browser contexts per test.

| Category | Tests | What It Verifies |
|----------|-------|------------------|
| Login | 1 | Student login, program screen renders |
| All Programs | 6 | Each program card clickable, track/dashboard shown correctly |
| All Tracks | 7 | Each track selectable, dashboard renders with CH & semester data |
| Admin Panel | 6 | Admin login, all 5 tabs switch correctly |
| Grades | 1 | Grade selectors work, Calculate GPA button |
| What-If | 1 | What-If opens, inputs fillable, Analyze button |

**Run:** `node e2e_test.mjs` (requires `npx playwright install chromium` first)

---

## 🚀 Deployment

### Vercel (Automatic)
1. Push to GitHub
2. Import to Vercel
3. Vercel auto-detects Vite framework from `vercel.json`
4. Build: `npx vite build` → output `dist/`

### Supabase (Optional)
1. Create project at https://supabase.com
2. Run `supabase-schema.sql` in SQL Editor
3. Copy project URL + anon key to Vercel environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Local Development
```
npm install
npm run dev          # → http://localhost:5173
npm run build        # → dist/
npm run preview      # Preview production build
npm run lint         # oxlint
```

---

## 🎨 Design Notes (for stitch.withgoogle.com)

### Brand Identity
- **University:** Alamein International University (AIU)
- **Faculty:** Faculty of Computer Science & Engineering
- **Colors:** Dark theme (#0f172a background), blue (#3b82f6) for primary actions, purple (#8b5cf6) for admin/GPA elements, green (#22c55e) for positive/complete, amber (#f59e0b) for warnings
- **Typography:** System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial)
- **Login Icon Area:** 64×64px gradient square (#3b82f6 → #8b5cf6) with "AIU" text

### Key Screens to Design

1. **Login Page** (`src/pages/LoginPage.jsx:32-144`)
   - Dark gradient background (135deg, #0f172a → #1e3a5f → #0f172a)
   - Frosted glass card (backdrop-filter: blur(20px), border-radius: 24px, max-width: 420px)
   - AIU logo placeholder (gradient square with "AIU" text)
   - Toggle buttons: Student | Admin (pill-style, blue when active)
   - Input: Student ID or Username
   - Password input (admin mode only)
   - Submit button: "Sign In" (student) or "Admin Login" (admin) — gradient background
   - Error message display area

2. **Program Selection Screen** (`Dashboard.jsx:184-218`)
   - Header: "AIU GPA Calculator" title + Logout button
   - Title: "Select Your Program"
   - Grid of program cards (auto-fill, minmax(250px, 1fr))
   - Each card: GraduationCap icon (#3b82f6), program name (h3), total CR HRS, department name
   - Hover: border highlights blue

3. **Track Selection Screen** (`Dashboard.jsx:221-257`)
   - ← Back to Programs button
   - Program name as title
   - Title: "Select Your Track"
   - Vertical list of track cards with name + total CR HRS

4. **Course Dashboard** (`Dashboard.jsx:262-853`)
   - Header: ← Change Track/Program link, program name, student ID, Save + Logout buttons
   - **Summary Cards Row:** Total CR HRS | Completed | Remaining | CGPA (— until Calculate clicked)
   - **Semester Tabs:** Horizontal row of semester buttons (Sem 1, Sem 2, etc.)
   - **Course Table:** For active semester, each row shows:
     - Type badge (CR/TE/UC/UE/FT/GP) with colored label
     - Warning icon (⚠️) if prerequisite missing
     - Course code + name
     - Credit hours (N CH)
     - Elective dropdown (for TE/UC/UE slots — select actual course from pool)
     - Grade dropdown (—, A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F)
   - **Calculate GPA Button** (purple gradient) + Clear All button (red)
   - **GPA Results Panel** (shown after Calculate):
     - Cumulative GPA (large number, colored: green≥3.5, amber≥2.5, red<2.5)
     - Completed Credits / Total
     - Per-semester GPA breakdown grid
     - Completed Courses list (code, name, semester, credit hours, grade)
   - **What-If Analysis Section** (collapsible):
     - Current CGPA + Completed Credits display
     - Two inputs: Planned credits (1-30), Target CGPA (0-4.0)
     - Analyze button
     - Results: achievable solutions (grade combinations) OR unachievable (max GPA + improvement plans with specific courses to retake)

5. **Admin Panel** (`src/pages/AdminPanel.jsx`)
   - Header: Shield icon, "Admin Panel" title, "Save Changes" + Logout buttons
   - Tab bar: Courses | Prerequisites | Programs | Pools (UC/UE) | Account
   - **Courses Tab:** Search bar + sortable grid (Code | Course Name | Credits) with inline editing
   - **Prerequisites Tab:** Add/remove prereq relationships between courses
   - **Pools Tab:** UC and UE pool management (add/remove/edit courses)
   - **Programs Tab:** Read-only view of all program/track definitions
   - **Account Tab:** Change admin username/password

### Color Palette
```
Background:          #0f172a (slate-900)
Cards/Surfaces:      rgba(255,255,255,0.03-0.05)
Borders:             rgba(255,255,255,0.08-0.15)
Primary (Student):   #3b82f6 (blue-500)
Primary (Admin):     #8b5cf6 (violet-500)
Success:             #22c55e (green-500)
Warning:             #f59e0b (amber-500)
Danger:              #ef4444 (red-500)
Text Primary:        #ffffff
Text Secondary:      #64748b (slate-400) / #94a3b8 (slate-400)
Gradient (Login):    135deg, #0f172a, #1e3a5f, #0f172a
Gradient (Buttons):  135deg, #3b82f6, #2563eb / 135deg, #8b5cf6, #6d28d9
```

### Icons Used (from lucide-react)
GraduationCap, BookOpen, BarChart3, Save, LogOut, ChevronDown, ChevronUp,
AlertTriangle, CheckCircle, Trash2, Target, TrendingUp, LogIn, Shield, User,
Plus, X, GitBranch, List

---

## 🐛 Known Issues & Fix History

| Issue | Fix |
|-------|-----|
| White screen on track-based programs | Added `if (!semesters) return []` guard in `getEffectiveCourses()` |
| Dashboard crash on track programs | `prog ? prog.semesters : []` → `prog?.semesters || []` |
| Software Engineering track not found | Track ID `"software-engineering-track"` → `"software-engineering"` to match object key |
| Missing courses (CHE142, MAT121, etc.) | Added all 11 missing codes with 3 CH each |
| F grades not lowering GPA | Confirmed: 0 points × credit hours = contributes 0 to GPA |
| Supabase fallback | When env vars missing, app uses localStorage only — no crash |

---

## 📋 Scripts Reference

```
npm run dev          # Start dev server (Vite hot reload)
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run lint         # Run oxlint
npx playwright install chromium   # Install browser for E2E tests
node e2e_test.mjs    # Run all 22 E2E tests
```

---

## 👨‍💻 Technical Stack Notes

- **React 19 + Vite 8**: Modern, fast development with HMR
- **No TypeScript**: Pure JSX for simplicity
- **No CSS framework**: All inline styles (for complete design control)
- **No routing**: Single-page app — different screens rendered via conditional state in Dashboard.jsx
- **Debounced Supabase sync**: 2-second debounce on save to avoid rate limits
- **Concurrent data loading**: Uses `Promise.all` for Supabase queries
- **Random query params** (`?r=Date.now()`) force fresh page loads in E2E tests
