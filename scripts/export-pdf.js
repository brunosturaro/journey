const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FILE   = path.resolve(__dirname, '../public/presentation.html');
const OUT    = path.resolve(__dirname, '../presentation.pdf');
const SLIDES = 9;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('file:///' + FILE.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  const buffers = [];

  for (let i = 0; i < SLIDES; i++) {
    // activate the right slide
    await page.evaluate((idx) => {
      document.querySelectorAll('.slide').forEach((s, n) => {
        s.classList.toggle('active', n === idx);
      });
      // update dots
      document.querySelectorAll('.dot').forEach((d, n) => {
        d.classList.toggle('active', n === idx);
      });
    }, i);

    // hide nav so it doesn't appear in the PDF
    await page.evaluate(() => {
      document.querySelectorAll('.nav, .dots').forEach(el => el.style.display = 'none');
    });

    const buf = await page.pdf({
      width:  '1280px',
      height: '720px',
      printBackground: true,
      pageRanges: '1'
    });
    buffers.push(buf);
  }

  await browser.close();

  // merge PDFs by concatenating raw bytes (works for simple cases via pdf-lib)
  // Instead, re-open with all slides rendered as @media print pages
  const browser2 = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page2 = await browser2.newPage();
  await page2.setViewport({ width: 1280, height: 720 });
  await page2.goto('file:///' + FILE.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  // inject print-mode styles: show all slides as stacked pages
  await page2.evaluate((total) => {
    const style = document.createElement('style');
    style.textContent = `
      body { overflow: visible !important; height: auto !important; }
      .deck { position: static !important; height: auto !important; }
      .slide {
        position: relative !important;
        opacity: 1 !important;
        pointer-events: all !important;
        width: 1280px;
        height: 720px;
        page-break-after: always;
        break-after: page;
        display: flex !important;
      }
      .nav, .dots { display: none !important; }
    `;
    document.head.appendChild(style);
    // make all slides active (visible)
    document.querySelectorAll('.slide').forEach(s => s.classList.add('active'));
  }, SLIDES);

  const pdf = await page2.pdf({
    width:  '1280px',
    height: '720px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser2.close();

  require('fs').writeFileSync(OUT, pdf);
  console.log('PDF saved to:', OUT);
})().catch(err => { console.error(err); process.exit(1); });
