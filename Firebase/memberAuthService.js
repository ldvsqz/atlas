import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

export async function getMemberAuthStatus(uid) {
  const call = httpsCallable(functions, 'getMemberAuthStatus');
  const response = await call({ uid });
  return response.data;
}

export async function createMemberEmailPasswordAccount(uid, temporaryPassword) {
  const call = httpsCallable(functions, 'createMemberEmailPasswordAccount');
  const response = await call({ uid, temporaryPassword });
  return response.data;
}

export async function createMemberWithTemporaryAccount(member) {
  const call = httpsCallable(functions, 'createMemberWithTemporaryAccount');
  const response = await call(member);
  return response.data;
}

export async function provisionExistingMemberAccounts() {
  const call = httpsCallable(functions, 'provisionExistingMemberAccounts', { timeout: 540000 });
  const response = await call();
  return response.data;
}
