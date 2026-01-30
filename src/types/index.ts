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

// Chat source (returned by API, used by frontend)
export interface ChatSource {
  id: string;
  docId: string;
  docType: 'legislation' | 'lat_ruling' | 'nutarimas' | 'vdi_faq' | 'vdi_doc';
  sourceFile: string;
  score: number;
  // Legislation fields
  articleNumber?: number;
  articleTitle?: string;
  lawCode?: string;
  // LAT ruling fields
  caseNumber?: string;
  caseTitle?: string;
  caseSummary?: string;
  sourceUrl?: string;
  sourcePage?: number;
  // VDI FAQ fields
  question?: string;
  category?: string;
  // VDI Doc / Nutarimas fields
  title?: string;
  tier?: number;
  topics?: string;
}

// Chat message (used by frontend)
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
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

// Consultation persistence types
export interface ConsultationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  timestamp: Date;
}

export interface ConsultationDocument {
  id: string;
  title: string;  // LLM-generated, max 60 chars
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed';
  savePreference: 'save' | 'dont_save' | 'pending';
  context: {
    userRole: string;
    companySize: string;
    topic: string;
  };
  messages: ConsultationMessage[];
}

export interface ConsultationMeta {
  id: string;
  title: string;
  updatedAt: Date;
  topic: string;
}
