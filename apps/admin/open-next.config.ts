import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Config padrão do OpenNext p/ Cloudflare Workers (sem cache incremental — app é client-side)
export default defineCloudflareConfig();
