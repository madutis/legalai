// User types
export type UserRole = 'employer' | 'employee' | 'hr' | 'other';
export type CompanySize = '<10' | '10-50' | '50-250' | '250+';

// Consultation types
export type ConsultationTopic =
  | 'hiring'
  | 'termination'
  | 'leave'
  | 'wages'
  | 'disciplinary'
  | 'material'
  | 'contracts'
  | 'safety'
  | 'other';

export type ConsultationStatus = 'active' | 'completed';

// Message types
export interface Citation {
  docId: string;
  docType: 'legislation' | 'lat_ruling' | 'nutarimas' | 'vdi_faq' | 'vdi_doc';
  title: string;
  section?: string;
  caseNumber?: string;
  excerpt: string;
  // VDI FAQ-specific fields
  question?: string;
  category?: string;
  // VDI Doc-specific fields
  chunkIndex?: number;
  totalChunks?: number;
  tier?: number;
  topics?: string;
}

// Document types (for ingested legal documents)
export interface ChunkMetadata {
  docId: string;
  docType: 'legislation' | 'lat_ruling' | 'nutarimas' | 'vdi_faq' | 'vdi_doc';
  sourceFile: string;
  sectionTitle?: string;
  caseNumber?: string;
  date?: string;
  chunkIndex: number;
  totalChunks?: number;
  title?: string;
  // Legislation-specific fields
  lawCode?: string; // e.g., 'DK' for Darbo Kodeksas, 'DSS' for DSS Įstatymas
  // VDI FAQ-specific fields
  question?: string;
  category?: string;
  // VDI Doc-specific fields
  tier?: number;
  topics?: string;
}

// Topic configuration
export interface TopicConfig {
  id: ConsultationTopic;
  labelLT: string;
  labelEN: string;
  questions: {
    id: string;
    textLT: string;
    options?: { value: string; labelLT: string }[];
  }[];
}

// API types
export interface ChatRequest {
  consultationId: string;
  message: string;
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
  tokenCount: number;
}

export interface SearchResult {
  docId: string;
  content: string;
  metadata: ChunkMetadata;
  score: number;
}
