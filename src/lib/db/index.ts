/**
 * LAT Database Module
 *
 * Provides typed access to the SQLite database for LAT rulings.
 * This is the source of truth for all case data.
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface LatPdf {
  id: string;
  url: string;
  filename: string;
  year: number;
  month: string;
  downloaded_at: string;
  page_count: number | null;
  section_start: number | null;
  section_end: number | null;
  section_text: string | null;
  status: 'downloaded' | 'extracted' | 'processed' | 'failed';
  error_message: string | null;
  extracted_at: string | null;
  processed_at: string | null;
}

export interface LatCase {
  id: string;
  pdf_id: string;
  case_number: string | null;
  title: string;
  summary: string;
  full_text: string;
  page_start: number;
  page_end: number | null;
  is_labor_law: boolean;
  confidence: 'high' | 'medium' | 'low' | null;
  model_version: string | null;
  extracted_at: string;
}

export interface LatVector {
  case_id: string;
  vector_id: string;
  embedding_model: string | null;
  ingested_at: string;
}

// Input types (for creating/updating)
export type LatPdfInput = Omit<LatPdf, 'extracted_at' | 'processed_at'>;
export type LatCaseInput = Omit<LatCase, 'extracted_at'>;
export type LatVectorInput = Omit<LatVector, 'ingested_at'>;

// ============================================================================
// Database Connection
// ============================================================================

// Try multiple paths for Vercel compatibility
function getDbPath(): string {
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'lat.db'),
    path.join(__dirname, '..', '..', '..', '..', 'data', 'lat.db'),
    '/var/task/data/lat.db', // Vercel serverless path
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Default to cwd path, will error if not found
  return possiblePaths[0];
}

const SCHEMA_PATH = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');

let db: Database.Database | null = null;

/**
 * Get database connection (singleton pattern)
 */
export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath();

    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      console.error('Database not found at:', dbPath);
      console.error('CWD:', process.cwd());
      console.error('__dirname:', __dirname);
      throw new Error(`Database not found: ${dbPath}`);
    }

    // Open database in read-only mode for serverless
    db = new Database(dbPath, { readonly: true, fileMustExist: true });

    // Enable foreign keys
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/**
 * Initialize database schema
 */
function initSchema(database: Database.Database): void {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  database.exec(schema);
}

/**
 * Close database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================================================
// PDF Operations
// ============================================================================

/**
 * Get all PDFs
 */
export function getAllPdfs(): LatPdf[] {
  const stmt = getDb().prepare('SELECT * FROM lat_pdfs ORDER BY year DESC, month');
  return stmt.all() as LatPdf[];
}

/**
 * Get PDF by ID
 */
export function getPdfById(id: string): LatPdf | null {
  const stmt = getDb().prepare('SELECT * FROM lat_pdfs WHERE id = ?');
  return (stmt.get(id) as LatPdf) || null;
}

/**
 * Get PDFs by status
 */
export function getPdfsByStatus(status: LatPdf['status']): LatPdf[] {
  const stmt = getDb().prepare('SELECT * FROM lat_pdfs WHERE status = ? ORDER BY year DESC');
  return stmt.all(status) as LatPdf[];
}

/**
 * Insert or update PDF
 */
export function upsertPdf(pdf: Partial<LatPdf> & { id: string }): void {
  const existing = getPdfById(pdf.id);

  if (existing) {
    // Update existing
    const fields = Object.keys(pdf).filter((k) => k !== 'id');
    const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
    const stmt = getDb().prepare(`UPDATE lat_pdfs SET ${setClause} WHERE id = @id`);
    stmt.run(pdf);
  } else {
    // Insert new
    const fields = Object.keys(pdf);
    const placeholders = fields.map((f) => `@${f}`).join(', ');
    const stmt = getDb().prepare(
      `INSERT INTO lat_pdfs (${fields.join(', ')}) VALUES (${placeholders})`
    );
    stmt.run(pdf);
  }
}

/**
 * Update PDF status
 */
export function updatePdfStatus(
  id: string,
  status: LatPdf['status'],
  errorMessage?: string
): void {
  const stmt = getDb().prepare(
    'UPDATE lat_pdfs SET status = ?, error_message = ? WHERE id = ?'
  );
  stmt.run(status, errorMessage || null, id);
}

// ============================================================================
// Case Operations
// ============================================================================

/**
 * Get all cases
 */
export function getAllCases(): LatCase[] {
  const stmt = getDb().prepare('SELECT * FROM lat_cases ORDER BY extracted_at DESC');
  const rows = stmt.all() as Array<Omit<LatCase, 'is_labor_law'> & { is_labor_law: number }>;
  return rows.map((r): LatCase => ({
    ...r,
    is_labor_law: Boolean(r.is_labor_law),
  }));
}

/**
 * Get case by ID
 */
export function getCaseById(id: string): LatCase | null {
  const stmt = getDb().prepare('SELECT * FROM lat_cases WHERE id = ?');
  const row = stmt.get(id) as (Omit<LatCase, 'is_labor_law'> & { is_labor_law: number }) | undefined;
  if (!row) return null;
  return { ...row, is_labor_law: Boolean(row.is_labor_law) };
}

/**
 * Get case by case number
 */
export function getCaseByCaseNumber(caseNumber: string): LatCase | null {
  const stmt = getDb().prepare('SELECT * FROM lat_cases WHERE case_number = ?');
  const row = stmt.get(caseNumber) as (Omit<LatCase, 'is_labor_law'> & { is_labor_law: number }) | undefined;
  if (!row) return null;
  return { ...row, is_labor_law: Boolean(row.is_labor_law) };
}

/**
 * Get cases by PDF ID
 */
export function getCasesByPdfId(pdfId: string): LatCase[] {
  const stmt = getDb().prepare(
    'SELECT * FROM lat_cases WHERE pdf_id = ? ORDER BY page_start'
  );
  const rows = stmt.all(pdfId) as Array<Omit<LatCase, 'is_labor_law'> & { is_labor_law: number }>;
  return rows.map((r) => ({ ...r, is_labor_law: Boolean(r.is_labor_law) }));
}

/**
 * Get cases without vectors (not yet ingested to Pinecone)
 */
export function getCasesWithoutVectors(): LatCase[] {
  const stmt = getDb().prepare(`
    SELECT c.* FROM lat_cases c
    LEFT JOIN lat_vectors v ON c.id = v.case_id
    WHERE v.case_id IS NULL AND c.is_labor_law = 1
    ORDER BY c.extracted_at
  `);
  const rows = stmt.all() as Array<Omit<LatCase, 'is_labor_law'> & { is_labor_law: number }>;
  return rows.map((r) => ({ ...r, is_labor_law: Boolean(r.is_labor_law) }));
}

/**
 * Insert case
 */
export function insertCase(caseData: LatCaseInput): void {
  const stmt = getDb().prepare(`
    INSERT INTO lat_cases (
      id, pdf_id, case_number, title, summary, full_text,
      page_start, page_end, is_labor_law, confidence,
      model_version, extracted_at
    ) VALUES (
      @id, @pdf_id, @case_number, @title, @summary, @full_text,
      @page_start, @page_end, @is_labor_law, @confidence,
      @model_version, datetime('now')
    )
  `);
  stmt.run({
    ...caseData,
    is_labor_law: caseData.is_labor_law ? 1 : 0,
  });
}

/**
 * Insert multiple cases (transaction)
 * Uses INSERT OR IGNORE to skip duplicates (same case_number)
 */
export function insertCases(cases: LatCaseInput[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO lat_cases (
      id, pdf_id, case_number, title, summary, full_text,
      page_start, page_end, is_labor_law, confidence,
      model_version, extracted_at
    ) VALUES (
      @id, @pdf_id, @case_number, @title, @summary, @full_text,
      @page_start, @page_end, @is_labor_law, @confidence,
      @model_version, datetime('now')
    )
  `);

  const insertMany = db.transaction((items: LatCaseInput[]) => {
    for (const item of items) {
      stmt.run({
        ...item,
        is_labor_law: item.is_labor_law ? 1 : 0,
      });
    }
  });

  insertMany(cases);
}

/**
 * Delete cases by PDF ID (for re-processing)
 */
export function deleteCasesByPdfId(pdfId: string): number {
  const stmt = getDb().prepare('DELETE FROM lat_cases WHERE pdf_id = ?');
  const result = stmt.run(pdfId);
  return result.changes;
}

/**
 * Count cases
 */
export function countCases(): { total: number; withCaseNumber: number; laborLaw: number } {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) as count FROM lat_cases').get() as { count: number }).count;
  const withCaseNumber = (
    db.prepare("SELECT COUNT(*) as count FROM lat_cases WHERE case_number IS NOT NULL AND case_number != ''").get() as { count: number }
  ).count;
  const laborLaw = (
    db.prepare('SELECT COUNT(*) as count FROM lat_cases WHERE is_labor_law = 1').get() as { count: number }
  ).count;
  return { total, withCaseNumber, laborLaw };
}

// ============================================================================
// Vector Operations
// ============================================================================

/**
 * Get vector by case ID
 */
export function getVectorByCaseId(caseId: string): LatVector | null {
  const stmt = getDb().prepare('SELECT * FROM lat_vectors WHERE case_id = ?');
  return (stmt.get(caseId) as LatVector) || null;
}

/**
 * Insert vector record
 */
export function insertVector(vector: LatVectorInput): void {
  const stmt = getDb().prepare(`
    INSERT INTO lat_vectors (case_id, vector_id, embedding_model, ingested_at)
    VALUES (@case_id, @vector_id, @embedding_model, datetime('now'))
  `);
  stmt.run(vector);
}

/**
 * Insert multiple vectors (transaction)
 */
export function insertVectors(vectors: LatVectorInput[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO lat_vectors (case_id, vector_id, embedding_model, ingested_at)
    VALUES (@case_id, @vector_id, @embedding_model, datetime('now'))
  `);

  const insertMany = db.transaction((items: LatVectorInput[]) => {
    for (const item of items) {
      stmt.run(item);
    }
  });

  insertMany(vectors);
}

/**
 * Delete vector by case ID
 */
export function deleteVectorByCaseId(caseId: string): void {
  const stmt = getDb().prepare('DELETE FROM lat_vectors WHERE case_id = ?');
  stmt.run(caseId);
}

/**
 * Count vectors
 */
export function countVectors(): number {
  const stmt = getDb().prepare('SELECT COUNT(*) as count FROM lat_vectors');
  return (stmt.get() as { count: number }).count;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get database statistics
 */
export function getStats(): {
  pdfs: { total: number; byStatus: Record<string, number> };
  cases: { total: number; withCaseNumber: number; laborLaw: number };
  vectors: number;
} {
  const db = getDb();

  // PDF stats
  const pdfTotal = (db.prepare('SELECT COUNT(*) as count FROM lat_pdfs').get() as { count: number }).count;
  const pdfByStatus = db
    .prepare('SELECT status, COUNT(*) as count FROM lat_pdfs GROUP BY status')
    .all() as Array<{ status: string; count: number }>;
  const statusMap: Record<string, number> = {};
  for (const row of pdfByStatus) {
    statusMap[row.status] = row.count;
  }

  return {
    pdfs: { total: pdfTotal, byStatus: statusMap },
    cases: countCases(),
    vectors: countVectors(),
  };
}
