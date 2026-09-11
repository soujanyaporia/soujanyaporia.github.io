import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/math-for-primary/',
  server: {
    // `host: true` lets an iPad on the same Wi-Fi open the dev server.
    host: true,
    port: 5173,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
