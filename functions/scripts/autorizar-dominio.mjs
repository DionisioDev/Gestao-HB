// Adiciona um domínio aos "Authorized domains" do Firebase Auth via Identity Toolkit Admin API.
// Uso: node scripts/autorizar-dominio.mjs <dominio> [--projeto <id>]
// Credencial: serviceAccount.json na raiz ou `firebase login` (ver lib/credencial-google.mjs).
import { obterCredencial } from './lib/credencial-google.mjs';

const argumentos = process.argv.slice(2);
const dominio = argumentos.find((a) => !a.startsWith('--'));
const indiceProjeto = argumentos.indexOf('--projeto');
const projetoInformado = indiceProjeto >= 0 ? argumentos[indiceProjeto + 1] : undefined;

if (!dominio) {
  console.error('Uso: node scripts/autorizar-dominio.mjs <dominio> [--projeto <id>]');
  process.exit(1);
}

const { token, projeto: projetoDaCredencial, origem } = await obterCredencial();
const projeto = projetoInformado ?? projetoDaCredencial ?? 'gestao-hb';
console.log(`Credencial: ${origem} | projeto: ${projeto}`);

const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projeto}/config`;

const resGet = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
if (!resGet.ok) throw new Error(`GET config falhou: ${resGet.status} ${await resGet.text()}`);
const config = await resGet.json();
const dominios = config.authorizedDomains ?? [];
console.log('Domínios atuais:', dominios.join(', '));

// Sem process.exit() no caminho feliz: com handles ainda abertos o Node no Windows
// aborta com assert do libuv e devolve exit code != 0, quebrando o script em CI.
if (dominios.includes(dominio)) {
  console.log(`\nJá autorizado: ${dominio}`);
} else {
  const resPatch = await fetch(`${base}?updateMask=authorizedDomains`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorizedDomains: [...dominios, dominio] }),
  });
  if (!resPatch.ok) throw new Error(`PATCH config falhou: ${resPatch.status} ${await resPatch.text()}`);
  console.log(`\nOK: "${dominio}" adicionado aos domínios autorizados. O login já funciona no site publicado.`);
}
