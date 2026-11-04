import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type {Connect} from 'vite';
const legacyRedirect:Connect.NextHandleFunction=(req,res,next)=>{const url=(req as {url?:string}).url;if(url?.startsWith('/math-for-primary/')){res.statusCode=302;res.setHeader('Location',url.replace('/math-for-primary/','/singapore-primary-maths/'));res.end();}else next();};

export default defineConfig({
  plugins: [react(),{name:'legacy-maths-url',configureServer(server){server.middlewares.use(legacyRedirect);},configurePreviewServer(server){server.middlewares.use(legacyRedirect);}}],
  base: '/singapore-primary-maths/',
  worker: {format:'es'},
  server: {
    // `host: true` lets an iPad on the same Wi-Fi open the dev server.
    host: true,
    port: 5174,
    strictPort: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    maxWorkers: 2,
  },
});
