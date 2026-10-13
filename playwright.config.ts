import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({testDir:"./tests/e2e",fullyParallel:true,reporter:"list",use:{baseURL,trace:"retain-on-failure",...devices["Desktop Chrome"]},webServer:{command:`"${process.execPath}" node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port ${port}`,url:baseURL,reuseExistingServer:!process.env.CI,timeout:120_000}});
