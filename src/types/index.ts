import { Timestamp } from 'firebase/firestore';

// User types
export type UserRole = 'employer' | 'employee' | 'hr' | 'other';
export type CompanySize = '<10' | '10-50' | '50-250' | '250+';

export interface User {
  id: string;
  email: string;
  role?: UserRole;
  companySize?: CompanySize;
  createdAt: Timestamp;
  consultationCount: number;
}

// Consultation types
export type ConsultationTopic =
  | 'hiring'
  | 'termination'
  | 'leave'
  | 'wages'
  | 'contracts'
  | 'discrimination'
  | 'other';

export type ConsultationStatus = 'active' | 'completed';

export interface Consultation {
  id: string;
  userId: string;
  topic: ConsultationTopic;
  context: Record<string, string>;
  createdAt: Timestamp;
  status: ConsultationStatus;
}

// Message types
export interface Citation {
  docId: string;
  docType: 'legislation' | 'ruling';
  title: string;
  section?: string;
  caseNumber?: string;
  excerpt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  createdAt: Timestamp;
  tokenCount?: number;
}

// Document types (for ingested legal documents)
export interface ChunkMetadata {
  docId: string;
  docType: 'legislation' | 'ruling';
  sourceFile: string;
  sectionTitle?: string;
  caseNumber?: string;
  date?: string;
  chunkIndex: number;
}

export interface LegalDocument {
  id: string;
  type: 'legislation' | 'ruling';
  title: string;
  sourceFile: string;
  fullText: string;
  processedAt: Timestamp;
  chunkCount: number;
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
