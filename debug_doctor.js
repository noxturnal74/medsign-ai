const playwright = require('D:\\PKM\\medsign-ai\\docs\\assets\\node_modules\\playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[PAGE ERROR]`, err.stack || err.message);
  });

  console.log('Navigating to http://localhost:3001/doctor...');
  try {
    const res = await page.goto('http://localhost:3001/doctor', { waitUntil: 'load' });
    console.log('Status:', res.status());
    console.log('Waiting 4 seconds for loading screen to unmount...');
    await new Promise(r => setTimeout(r, 4000));
    console.log('Body HTML after 4s:', await page.locator('body').innerHTML());
  } catch (err) {
    console.error('Error during doctor navigation:', err);
  }

  await browser.close();
})();
