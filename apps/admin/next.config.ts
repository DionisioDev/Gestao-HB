import { createRequire } from 'node:module';
import path from 'node:path';
import type { NextConfig } from 'next';

const require_ = createRequire(import.meta.url);
const arquivoDoPacote = (pacote: string, relativo: string) =>
  path.join(path.dirname(require_.resolve(`${pacote}/package.json`)), relativo);

// O admin é 100% client-side: o SSR só renderiza o shell, mas ainda carrega os módulos
// do Firebase no servidor. Sem estes aliases o bundle do servidor resolve a build Node
// do Firestore, que depende de protobufjs e gera código com `new Function` — proibido no
// runtime do Cloudflare Workers (EvalError: code generation from strings disallowed).
// Apontamos para os mesmos arquivos que a condição "browser" usaria; como o export map
// não expõe subcaminhos, o alias precisa ser o caminho do arquivo em disco.
const buildsBrowserDoFirebase = {
  '@firebase/auth$': arquivoDoPacote('@firebase/auth', 'dist/esm2017/index.js'),
  '@firebase/firestore$': arquivoDoPacote('@firebase/firestore', 'dist/index.esm2017.js'),
  '@firebase/storage$': arquivoDoPacote('@firebase/storage', 'dist/index.esm2017.js'),
  '@firebase/functions$': arquivoDoPacote('@firebase/functions', 'dist/esm/index.esm2017.js'),
};

const nextConfig: NextConfig = {
  transpilePackages: ['@gestao-hb/core', '@gestao-hb/ui', '@gestao-hb/firebase'],

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = { ...config.resolve.alias, ...buildsBrowserDoFirebase };
    }
    return config;
  },
};

export default nextConfig;
