-- LAT Rulings Database Schema
-- Version: 1.0
--
-- This schema supports the LAT (Lithuanian Supreme Court) rulings pipeline:
-- 1. PDF tracking (downloads)
-- 2. Case extraction (LLM processing)
-- 3. Vector tracking (Pinecone sync)

-- ============================================================================
-- PDF Tracking
-- ============================================================================
-- Tracks downloaded PDFs from LAT website
CREATE TABLE IF NOT EXISTS lat_pdfs (
  id              TEXT PRIMARY KEY,     -- e.g., "2024-kovas"
  url             TEXT NOT NULL,        -- Full PDF URL
  filename        TEXT NOT NULL,        -- Local filename
  year            INTEGER NOT NULL,     -- Publication year
  month           TEXT NOT NULL,        -- Publication month (Lithuanian)
  downloaded_at   TEXT NOT NULL,        -- ISO timestamp
  page_count      INTEGER,              -- Total pages in PDF

  -- Section boundaries (Darbo teisė)
  section_start   INTEGER,              -- Start page (1-indexed)
  section_end     INTEGER,              -- End page (1-indexed)
  section_text    TEXT,                 -- Raw text of labor law section

  -- Processing status
  status          TEXT DEFAULT 'downloaded', -- downloaded/extracted/processed/failed
  error_message   TEXT,                 -- Error details if failed

  -- Timestamps
  extracted_at    TEXT,                 -- When text was extracted
  processed_at    TEXT                  -- When cases were extracted
);

-- ============================================================================
-- Case Storage (SOURCE OF TRUTH)
-- ============================================================================
-- Individual court cases extracted from PDFs
CREATE TABLE IF NOT EXISTS lat_cases (
  id              TEXT PRIMARY KEY,     -- e.g., "2024-kovas-001"
  pdf_id          TEXT NOT NULL,        -- References lat_pdfs(id)

  -- Case identification
  case_number     TEXT,                 -- e.g., "e3K-3-176-684/2024" (nullable)

  -- Content (no truncation!)
  title           TEXT NOT NULL,        -- Short descriptive title (max ~100 chars)
  summary         TEXT NOT NULL,        -- AI-generated summary (max ~500 chars)
  full_text       TEXT NOT NULL,        -- COMPLETE case text

  -- Source location
  page_start      INTEGER NOT NULL,     -- Start page in PDF (1-indexed)
  page_end        INTEGER,              -- End page in PDF (1-indexed)

  -- Quality metadata
  is_labor_law    INTEGER DEFAULT 1,    -- 1=yes, 0=no (SQLite boolean)
  confidence      TEXT,                 -- high/medium/low

  -- Processing metadata
  model_version   TEXT,                 -- e.g., "gemini-2.5-flash"
  extracted_at    TEXT NOT NULL,        -- ISO timestamp

  -- Foreign key
  FOREIGN KEY (pdf_id) REFERENCES lat_pdfs(id) ON DELETE CASCADE
);

-- Unique constraint on case_number (only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_unique_number
  ON lat_cases(case_number) WHERE case_number IS NOT NULL AND case_number != '';

-- ============================================================================
-- Vector Tracking
-- ============================================================================
-- Tracks what's been ingested to Pinecone
CREATE TABLE IF NOT EXISTS lat_vectors (
  case_id         TEXT PRIMARY KEY,     -- References lat_cases(id)
  vector_id       TEXT NOT NULL,        -- Pinecone vector ID
  embedding_model TEXT,                 -- e.g., "text-embedding-004"
  ingested_at     TEXT NOT NULL,        -- ISO timestamp

  FOREIGN KEY (case_id) REFERENCES lat_cases(id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pdfs_status ON lat_pdfs(status);
CREATE INDEX IF NOT EXISTS idx_pdfs_year ON lat_pdfs(year);
CREATE INDEX IF NOT EXISTS idx_cases_pdf_id ON lat_cases(pdf_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON lat_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_year ON lat_cases(pdf_id); -- For year-based queries

-- ============================================================================
-- Schema Version Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version         INTEGER PRIMARY KEY,
  applied_at      TEXT NOT NULL
);

-- Insert initial version
INSERT OR IGNORE INTO schema_version (version, applied_at)
VALUES (1, datetime('now'));
