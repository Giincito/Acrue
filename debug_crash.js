const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if(msg.type() === 'error') {
        console.log('BROWSER_CONSOLE_ERROR:', msg.text());
      }
    });

    page.on('pageerror', err => {
      console.log('BROWSER_PAGE_ERROR:', err.message);
    });

    await page.goto('http://localhost:3000/tareas/prioridades', { waitUntil: 'networkidle2' });
    console.log('Navigated to page.');
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
  } catch(e) {
    console.error('SCRIPT_ERROR', e);
  }
})();
