-- AIU GPA Calculator — Supabase Schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

-- Admin account
CREATE TABLE IF NOT EXISTS admin_account (
  id BIGINT PRIMARY KEY DEFAULT 1,
  username TEXT NOT NULL DEFAULT 'Ahmed',
  password TEXT NOT NULL DEFAULT '3320',
  CONSTRAINT single_row CHECK (id = 1)
);

-- Prerequisites: course -> prerequisite
CREATE TABLE IF NOT EXISTS prerequisites (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course TEXT NOT NULL,
  prerequisite TEXT NOT NULL,
  UNIQUE (course, prerequisite)
);

-- Course overrides (admin-editable credits/names)
CREATE TABLE IF NOT EXISTS course_overrides (
  code TEXT PRIMARY KEY,
  name TEXT,
  credits REAL
);

-- UC pool (University Requirement courses per slot)
CREATE TABLE IF NOT EXISTS uc_pool (
  slot BIGINT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT,
  credits REAL DEFAULT 2
);

-- UE pool (University Elective courses per slot)
CREATE TABLE IF NOT EXISTS ue_pool (
  slot BIGINT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT,
  credits REAL DEFAULT 2
);

-- Student grades
CREATE TABLE IF NOT EXISTS grades (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_code TEXT NOT NULL,
  grade TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, course_code)
);

-- UC slot selections per student
CREATE TABLE IF NOT EXISTS uc_selections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id TEXT NOT NULL,
  slot BIGINT NOT NULL,
  course_code TEXT NOT NULL,
  UNIQUE (student_id, slot)
);

-- UE slot selections per student
CREATE TABLE IF NOT EXISTS ue_selections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id TEXT NOT NULL,
  slot BIGINT NOT NULL,
  course_code TEXT NOT NULL,
  UNIQUE (student_id, slot)
);

-- Enable Row Level Security
ALTER TABLE admin_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE uc_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE ue_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE uc_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ue_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all operations (safe with anon key for this educational app)
-- In production, you would restrict based on student_id matching

CREATE POLICY "Allow all on admin_account"
  ON admin_account FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on prerequisites"
  ON prerequisites FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on course_overrides"
  ON course_overrides FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on uc_pool"
  ON uc_pool FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on ue_pool"
  ON ue_pool FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on grades"
  ON grades FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on uc_selections"
  ON uc_selections FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on ue_selections"
  ON ue_selections FOR ALL USING (true) WITH CHECK (true);

-- Insert default admin
INSERT INTO admin_account (id, username, password)
VALUES (1, 'Ahmed', '3320')
ON CONFLICT (id) DO NOTHING;

-- Insert default UC pool (from programs.js data: 7 slots)
INSERT INTO uc_pool (slot, code, name, credits) VALUES
  (1, 'UC1', 'University Requirement 1', 2),
  (2, 'UC2', 'University Requirement 2', 2),
  (3, 'UC3', 'University Requirement 3', 2),
  (4, 'UC4', 'University Requirement 4', 2),
  (5, 'UC5', 'University Requirement 5', 2),
  (6, 'UC6', 'University Requirement 6', 2),
  (7, 'UC7', 'University Requirement 7', 2)
ON CONFLICT (slot) DO NOTHING;

-- Insert default UE pool (from programs.js data: 4 slots)
INSERT INTO ue_pool (slot, code, name, credits) VALUES
  (1, 'E1', 'Technical Elective 1', 2),
  (2, 'E2', 'Technical Elective 2', 2),
  (3, 'E3', 'Technical Elective 3', 2),
  (4, 'E4', 'Technical Elective 4', 2)
ON CONFLICT (slot) DO NOTHING;
