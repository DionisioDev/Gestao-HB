// Adiciona um domínio aos "Authorized domains" do Firebase Auth via Identity Toolkit Admin API.
// Uso: node scripts/autorizar-dominio.mjs <dominio>
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';

const dominio = process.argv[2];
if (!dominio) {
  console.error('Uso: node scripts/autorizar-dominio.mjs <dominio>');
  process.exit(1);
}

const chave = JSON.parse(readFileSync(new URL('../../serviceAccount.json', import.meta.url), 'utf8'));
const projeto = chave.project_id;
const app = initializeApp({ credential: cert(chave) });
const { access_token: token } = await app.options.credential.getAccessToken();
const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projeto}/config`;

const resGet = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
if (!resGet.ok) throw new Error(`GET config falhou: ${resGet.status} ${await resGet.text()}`);
const config = await resGet.json();
const dominios = config.authorizedDomains ?? [];
console.log('Domínios atuais:', dominios.join(', '));

if (dominios.includes(dominio)) {
  console.log(`\nJá autorizado: ${dominio}`);
  process.exit(0);
}

const resPatch = await fetch(`${base}?updateMask=authorizedDomains`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ authorizedDomains: [...dominios, dominio] }),
});
if (!resPatch.ok) throw new Error(`PATCH config falhou: ${resPatch.status} ${await resPatch.text()}`);
console.log(`\nOK: "${dominio}" adicionado aos domínios autorizados. O login já funciona no site publicado.`);
