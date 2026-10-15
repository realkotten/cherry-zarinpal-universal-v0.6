import type { Appointment, Reservation } from './types';

// [Local Mode] Firebase connection is fully disabled.
// The backend at /payment is the single source of truth.

export const app: any = null;
export const db: any = null;
export const auth: any = { currentUser: null };

export const googleProvider: any = {};
export const appleProvider: any = {};

export class RecaptchaVerifier {
  constructor(..._args: any[]) {}
  clear(): void {}
  render(): Promise<number> {
    return Promise.resolve(0);
  }
}

export type ConfirmationResult = any;
export type FirebaseUser = any;

export const signInWithPhoneNumber = async (..._args: any[]): Promise<any> => {
  console.warn('[local] firebase disabled');
  return null;
};

export function clearPhoneRecaptcha(_containerId = 'phone-recaptcha-container'): void {
  console.warn('[local] firebase disabled');
}

export function getOrCreatePhoneRecaptcha(_containerId = 'phone-recaptcha-container', _isInvisible = true): any {
  console.warn('[local] firebase disabled');
  return null;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(_error: unknown, _operationType: OperationType, _path: string | null): never {
  console.warn('[local] firebase disabled');
  throw new Error('[local] firebase disabled');
}

export async function testConnection(): Promise<boolean> {
  console.warn('[local] firebase disabled');
  return false;
}

export async function syncUserProfile(_user: any, _extraData?: any): Promise<any> {
  console.warn('[local] firebase disabled');
  return null;
}

export async function syncAppointmentToFirestore(_appointment: Appointment): Promise<boolean> {
  console.warn('[local] firebase disabled');
  return false;
}

export async function syncBookingToFirestore(_reservation: Reservation): Promise<boolean> {
  console.warn('[local] firebase disabled');
  return false;
}

export async function syncCurrentReservationToFirestore(_reservation: Reservation): Promise<boolean> {
  console.warn('[local] firebase disabled');
  return false;
}

export async function fetchBookingFromFirestore(_bookingId: string): Promise<Reservation | null> {
  console.warn('[local] firebase disabled');
  return null;
}

export function subscribeToBookingInFirestore(
  _bookingId: string,
  _onUpdate: (booking: Reservation) => void,
  _onError?: (err: any) => void
): () => void {
  console.warn('[local] firebase disabled');
  return () => {};
}

export async function updateBookingStatusInFirestore(
  _bookingId: string,
  _status: Reservation['status']
): Promise<boolean> {
  console.warn('[local] firebase disabled');
  return false;
}

export function subscribeToFirestoreAppointments(
  _onUpdate: (appointments: Appointment[]) => void
): () => void {
  console.warn('[local] firebase disabled');
  return () => {};
}

export async function updateAppointmentStatusInFirestore(
  _appointmentId: string,
  _status: Appointment['status']
): Promise<boolean> {
  console.warn('[local] firebase disabled');
  return false;
}

export async function deleteAppointmentFromFirestore(_appointmentId: string): Promise<boolean> {
  console.warn('[local] firebase disabled');
  return false;
}

export const signInWithPopup = async (..._args: any[]): Promise<any> => {
  console.warn('[local] firebase disabled');
  return null;
};

export const signInWithEmailAndPassword = async (..._args: any[]): Promise<any> => {
  console.warn('[local] firebase disabled');
  return null;
};

export const createUserWithEmailAndPassword = async (..._args: any[]): Promise<any> => {
  console.warn('[local] firebase disabled');
  return null;
};

export const signOut = async (..._args: any[]): Promise<any> => {
  console.warn('[local] firebase disabled');
  return null;
};

export const onAuthStateChanged = (_auth: any, callback: any): (() => void) => {
  console.warn('[local] firebase disabled');
  if (typeof callback === 'function') {
    callback(null);
  }
  return () => {};
};

export const updateProfile = async (..._args: any[]): Promise<any> => {
  console.warn('[local] firebase disabled');
  return null;
};

export const sendPasswordResetEmail = async (..._args: any[]): Promise<any> => {
  console.warn('[local] firebase disabled');
  return null;
};
