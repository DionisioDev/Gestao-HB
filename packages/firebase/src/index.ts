import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

export interface ClienteFirebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
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

  if (emuladores) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }

  return { app, auth, db, storage };
}
