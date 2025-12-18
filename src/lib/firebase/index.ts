export { app, auth, db } from './config';
export {
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  getUserProfile,
  updateUserProfile,
  onAuthChange,
} from './auth';
export {
  createConsultation,
  getConsultation,
  getUserConsultations,
  completeConsultation,
  addMessage,
  getMessages,
} from './consultations';
