import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { serve } = require('../showreel/server.cjs');
const { url } = await serve(fileURLToPath(new URL('../dist/', import.meta.url)), Number(process.env.PORT || 4173));
console.log(`Blurb preview: ${url}`);
