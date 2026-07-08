export { configFirebase } from './config.js';

import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

export const REGIAO_FUNCTIONS = 'southamerica-east1';

export interface ClienteFirebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
  /** Atalho tipado para chamar uma Cloud Function callable. */
  chamar: <Req, Res>(nome: string) => (dados: Req) => Promise<Res>;
}

export interface OpcoesCliente {
  config: FirebaseOptions;
  /** Ativa persistência offline do Firestore (app do vendedor — ADR-008). */
  offline?: boolean;
  /** Conecta aos emuladores locais (desenvolvimento). */
  emuladores?: boolean;
}

/** Inicialização única do Firebase para os apps (admin e vendedor). */
export function criarClienteFirebase({ config, offline = false, emuladores = false }: OpcoesCliente): ClienteFirebase {
  const app = getApps()[0] ?? initializeApp(config);

  const db = initializeFirestore(
    app,
    offline
      ? { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }
      : {},
  );
  const auth = getAuth(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, REGIAO_FUNCTIONS);

  if (emuladores) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }

  const chamar = <Req, Res>(nome: string) => {
    const fn = httpsCallable<Req, Res>(functions, nome);
    return async (dados: Req) => (await fn(dados)).data;
  };

  return { app, auth, db, storage, functions, chamar };
}
