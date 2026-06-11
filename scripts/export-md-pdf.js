const puppeteer = require('puppeteer-core');
const { marked }  = require('marked');
const fs          = require('fs');
const path        = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MD_IN  = path.resolve(__dirname, '..', process.argv[2] || 'CODIGO.md');
const OUT    = path.resolve(__dirname, '..', process.argv[3] || path.basename(MD_IN, '.md') + '.pdf');

const markdown = fs.readFileSync(MD_IN, 'utf8');
const body     = marked.parse(markdown);

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.7;
      color: #1a1a1a;
      padding: 48px 56px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1 { font-size: 26px; margin-bottom: 6px; color: #0d2044; border-bottom: 3px solid #1f6feb; padding-bottom: 10px; }
    h2 { font-size: 19px; margin-top: 36px; margin-bottom: 10px; color: #0d2044; border-bottom: 1px solid #d0d7de; padding-bottom: 6px; }
    h3 { font-size: 15px; margin-top: 22px; margin-bottom: 6px; color: #24292f; }
    h4 { font-size: 13px; margin-top: 16px; margin-bottom: 4px; color: #24292f; font-weight: 700; }
    p  { margin-bottom: 10px; }
    ul, ol { padding-left: 22px; margin-bottom: 10px; }
    li { margin-bottom: 4px; }
    code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 12px;
      background: #f0f3f6;
      padding: 1px 5px;
      border-radius: 4px;
      color: #c7254e;
    }
    pre {
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 14px 16px;
      margin: 10px 0 14px 0;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
      color: #24292f;
      font-size: 11.5px;
      line-height: 1.6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 12px;
    }
    th {
      background: #0d2044;
      color: #fff;
      padding: 7px 10px;
      text-align: left;
      font-weight: 600;
    }
    td { padding: 6px 10px; border-bottom: 1px solid #e1e4e8; }
    tr:nth-child(even) td { background: #f6f8fa; }
    blockquote {
      border-left: 4px solid #1f6feb;
      padding: 4px 14px;
      color: #57606a;
      margin: 10px 0;
    }
    hr { border: none; border-top: 1px solid #d0d7de; margin: 28px 0; }
  </style>
</head>
<body>${body}</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });

  await browser.close();
  fs.writeFileSync(OUT, pdf);
  console.log('PDF saved to:', OUT);
})().catch(err => { console.error(err); process.exit(1); });
