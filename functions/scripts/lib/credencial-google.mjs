// Access token do Google para os scripts administrativos, em duas vias:
//   1. serviceAccount.json na raiz do repo (ambientes de CI / máquinas sem CLI);
//   2. credencial do Firebase CLI (`firebase login`), renovada quando expirada.
// A via 2 evita ter de baixar e guardar chave de service account só para rodar script.
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const CAMINHO_SERVICE_ACCOUNT = new URL('../../../serviceAccount.json', import.meta.url);

// client_id/secret públicos do firebase-tools — identificam o app no fluxo OAuth,
// não são segredo (o refresh_token do usuário é que dá o acesso).
const CLIENTE_FIREBASE_CLI = {
  id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
  secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
};

function caminhoConfigstore() {
  const candidatos = [
    path.join(homedir(), '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA ?? '', 'configstore', 'firebase-tools.json'),
  ];
  return candidatos.find((c) => c && existsSync(c));
}

async function tokenDoServiceAccount() {
  const chave = JSON.parse(readFileSync(CAMINHO_SERVICE_ACCOUNT, 'utf8'));
  const { cert, initializeApp } = await import('firebase-admin/app');
  const app = initializeApp({ credential: cert(chave) }, `script-${Date.now()}`);
  const { access_token: token } = await app.options.credential.getAccessToken();
  return { token, projeto: chave.project_id, origem: 'serviceAccount.json' };
}

async function tokenDoFirebaseCli() {
  const arquivo = caminhoConfigstore();
  if (!arquivo) return null;

  const { tokens } = JSON.parse(readFileSync(arquivo, 'utf8'));
  if (!tokens?.refresh_token) return null;

  // Margem de 5 min para não usar um token que expira no meio da chamada.
  if (tokens.access_token && tokens.expires_at > Date.now() + 5 * 60_000) {
    return { token: tokens.access_token, origem: 'firebase CLI' };
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENTE_FIREBASE_CLI.id,
      client_secret: CLIENTE_FIREBASE_CLI.secret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Refresh do token do Firebase CLI falhou: ${res.status} ${await res.text()}`);
  const { access_token: token } = await res.json();
  return { token, origem: 'firebase CLI (renovado)' };
}

/**
 * Retorna { token, projeto?, origem }. Prefere o service account quando presente;
 * senão usa a credencial do `firebase login`.
 */
export async function obterCredencial() {
  if (existsSync(CAMINHO_SERVICE_ACCOUNT)) return tokenDoServiceAccount();

  const doCli = await tokenDoFirebaseCli();
  if (doCli) return doCli;

  throw new Error(
    'Sem credencial do Google. Rode `firebase login` ou coloque serviceAccount.json na raiz do repositório.',
  );
}
