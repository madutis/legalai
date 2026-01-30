import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import type {
  ConsultationDocument,
  ConsultationMeta,
  ConsultationMessage,
  ChatSource,
} from '@/types';

// Convert Firestore Timestamp to Date
function timestampToDate(ts: Timestamp | undefined): Date {
  return ts?.toDate() ?? new Date();
}

// Convert Date to Firestore Timestamp
function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

// Parse a message from Firestore format
function parseMessage(data: Record<string, unknown>): ConsultationMessage {
  return {
    id: data.id as string,
    role: data.role as 'user' | 'assistant',
    content: data.content as string,
    sources: data.sources as ChatSource[] | undefined,
    timestamp: timestampToDate(data.timestamp as Timestamp | undefined),
  };
}

// Parse consultation document from Firestore
function parseConsultationDoc(id: string, data: Record<string, unknown>): ConsultationDocument {
  const messagesRaw = (data.messages as Record<string, unknown>[] | undefined) ?? [];

  return {
    id,
    title: (data.title as string) ?? '',
    createdAt: timestampToDate(data.createdAt as Timestamp | undefined),
    updatedAt: timestampToDate(data.updatedAt as Timestamp | undefined),
    status: (data.status as 'active' | 'completed') ?? 'active',
    savePreference: (data.savePreference as 'save' | 'dont_save' | 'pending') ?? 'pending',
    context: {
      userRole: (data.context as Record<string, unknown>)?.userRole as string ?? '',
      companySize: (data.context as Record<string, unknown>)?.companySize as string ?? '',
      topic: (data.context as Record<string, unknown>)?.topic as string ?? '',
    },
    messages: messagesRaw.map(parseMessage),
  };
}

// Convert messages to Firestore format
function messagesToFirestore(messages: ConsultationMessage[]): Record<string, unknown>[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    sources: msg.sources,
    timestamp: dateToTimestamp(msg.timestamp),
  }));
}

export interface CreateConsultationData {
  title?: string;
  status?: 'active' | 'completed';
  savePreference?: 'save' | 'dont_save' | 'pending';
  context: {
    userRole: string;
    companySize: string;
    topic: string;
  };
  messages?: ConsultationMessage[];
}

/**
 * Create a new consultation document
 * @returns The generated consultation ID
 */
export async function createConsultation(
  uid: string,
  data: CreateConsultationData
): Promise<string> {
  const db = getFirebaseFirestore();
  const consultationsRef = collection(db, 'users', uid, 'consultations');
  const newDocRef = doc(consultationsRef);

  const now = new Date();

  await setDoc(newDocRef, {
    title: data.title ?? '',
    createdAt: dateToTimestamp(now),
    updatedAt: dateToTimestamp(now),
    status: data.status ?? 'active',
    savePreference: data.savePreference ?? 'pending',
    context: data.context,
    messages: data.messages ? messagesToFirestore(data.messages) : [],
  });

  return newDocRef.id;
}

export interface UpdateConsultationData {
  title?: string;
  status?: 'active' | 'completed';
  savePreference?: 'save' | 'dont_save' | 'pending';
  messages?: ConsultationMessage[];
}

/**
 * Update an existing consultation document (partial update with merge)
 */
export async function updateConsultation(
  uid: string,
  consultationId: string,
  data: UpdateConsultationData
): Promise<void> {
  const db = getFirebaseFirestore();
  const consultationRef = doc(db, 'users', uid, 'consultations', consultationId);

  const updateData: Record<string, unknown> = {
    updatedAt: dateToTimestamp(new Date()),
  };

  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.savePreference !== undefined) {
    updateData.savePreference = data.savePreference;
  }
  if (data.messages !== undefined) {
    updateData.messages = messagesToFirestore(data.messages);
  }

  await setDoc(consultationRef, updateData, { merge: true });
}

/**
 * Get a single consultation with all messages
 */
export async function getConsultation(
  uid: string,
  consultationId: string
): Promise<ConsultationDocument | null> {
  const db = getFirebaseFirestore();
  const consultationRef = doc(db, 'users', uid, 'consultations', consultationId);

  const snapshot = await getDoc(consultationRef);

  if (!snapshot.exists()) {
    return null;
  }

  return parseConsultationDoc(snapshot.id, snapshot.data());
}

/**
 * Get list of consultations (metadata only: id, title, updatedAt, topic)
 * Ordered by updatedAt desc, filtered to savePreference='save'
 */
export async function getUserConsultations(
  uid: string,
  limit = 50
): Promise<ConsultationMeta[]> {
  const db = getFirebaseFirestore();
  const consultationsRef = collection(db, 'users', uid, 'consultations');

  const q = query(
    consultationsRef,
    where('savePreference', '==', 'save'),
    orderBy('updatedAt', 'desc'),
    firestoreLimit(limit)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      title: (data.title as string) ?? '',
      updatedAt: timestampToDate(data.updatedAt as Timestamp | undefined),
      topic: (data.context as Record<string, unknown>)?.topic as string ?? '',
    };
  });
}

/**
 * Delete a single consultation
 */
export async function deleteConsultation(
  uid: string,
  consultationId: string
): Promise<void> {
  const db = getFirebaseFirestore();
  const consultationRef = doc(db, 'users', uid, 'consultations', consultationId);

  await deleteDoc(consultationRef);
}
