import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['scripts/audit-paper-bank.test.ts'],environment:'node',maxWorkers:1}});
