import type { FirebaseOptions } from 'firebase/app';

/**
 * Config pública do app Web (console Firebase → projeto gestao-hb).
 * Não é segredo: a proteção real vem das Security Rules, claims e App Check (arquitetura §4).
 */
export const configFirebase: FirebaseOptions = {
  apiKey: 'AIzaSyCeEy3Aclz05DTh2YUOSlnm7KuUcs50klo',
  authDomain: 'gestao-hb.firebaseapp.com',
  projectId: 'gestao-hb',
  storageBucket: 'gestao-hb.firebasestorage.app',
  messagingSenderId: '1057391379442',
  appId: '1:1057391379442:web:668b4eb10a818ce7fea16b',
};
