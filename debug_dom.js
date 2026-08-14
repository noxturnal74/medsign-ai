const playwright = require('D:\\PKM\\medsign-ai\\docs\\assets\\node_modules\\playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3001/patient...');
  await page.goto('http://localhost:3001/patient', { waitUntil: 'load' });
  
  console.log('Waiting 4 seconds for load and animations...');
  await new Promise(r => setTimeout(r, 4000));

  console.log('Inspecting DOM elements covering the screen...');
  const elements = await page.evaluate(() => {
    const list = [];
    // Get all elements in document
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const style = window.getComputedStyle(el);
      const isFixedOrAbsolute = style.position === 'fixed' || style.position === 'absolute';
      if (isFixedOrAbsolute) {
        const rect = el.getBoundingClientRect();
        // Check if it has dimensions covering a large part of screen
        if (rect.width > 200 && rect.height > 200) {
          list.push({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
            zIndex: style.zIndex,
            backgroundColor: style.backgroundColor,
            display: style.display,
            opacity: style.opacity
          });
        }
      }
    }
    return list;
  });

  console.log('Covering elements found:', JSON.stringify(elements, null, 2));

  await browser.close();
})();
