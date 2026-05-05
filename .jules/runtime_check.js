import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const routes = [
    '/',
    '/login',
    '/cadastro',
    '/plataforma',
    '/templates/funil-de-vendas',
    '/dashboard'
  ];

  for (const route of routes) {
    console.log(`Checking ${route}...`);
    try {
      const response = await page.goto('http://localhost:8080' + route, { waitUntil: 'networkidle' });
      const status = response.status();
      console.log(`Status: ${status}`);

      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => errors.push(`${request.url()} failed: ${request.failure().errorText}`));

      if (status !== 200 && status !== 302 && status !== 304) {
        console.log(`❌ Failed to load ${route}`);
      } else {
        console.log(`✅ ${route} loaded`);
      }

      if (errors.length > 0) {
        console.log(`Console/Network errors on ${route}:`, errors);
      }
    } catch (e) {
      console.log(`❌ Error checking ${route}: ${e.message}`);
    }
  }

  await browser.close();
})();
