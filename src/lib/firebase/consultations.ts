import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Consultation, Message, ConsultationTopic, Citation } from '@/types';

// Consultations
export async function createConsultation(
  userId: string,
  topic: ConsultationTopic,
  context: Record<string, string> = {}
): Promise<string> {
  const docRef = await addDoc(collection(db, 'consultations'), {
    userId,
    topic,
    context,
    createdAt: serverTimestamp(),
    status: 'active',
  });
  return docRef.id;
}

export async function getConsultation(consultationId: string): Promise<Consultation | null> {
  const docSnap = await getDoc(doc(db, 'consultations', consultationId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Consultation;
}

export async function getUserConsultations(userId: string): Promise<Consultation[]> {
  const q = query(
    collection(db, 'consultations'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Consultation);
}

export async function completeConsultation(consultationId: string): Promise<void> {
  await updateDoc(doc(db, 'consultations', consultationId), {
    status: 'completed',
  });
}

// Messages
export async function addMessage(
  consultationId: string,
  role: 'user' | 'assistant',
  content: string,
  citations?: Citation[],
  tokenCount?: number
): Promise<string> {
  const docRef = await addDoc(
    collection(db, 'consultations', consultationId, 'messages'),
    {
      role,
      content,
      citations: citations || [],
      createdAt: serverTimestamp(),
      tokenCount,
    }
  );
  return docRef.id;
}

export async function getMessages(consultationId: string): Promise<Message[]> {
  const q = query(
    collection(db, 'consultations', consultationId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Message);
}
