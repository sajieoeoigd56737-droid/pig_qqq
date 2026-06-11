// Captures each slide as a PNG using headless Chrome's CDP
// Usage: node capture_slides.js <html_path> <num_slides> <out_dir>
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const htmlPath = process.argv[2] || 'index.html';
const numSlides = parseInt(process.argv[3] || '10');
const outDir = process.argv[4] || 'slide_pngs';

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Serve the file locally so Chrome can load assets
const absHtml = path.resolve(htmlPath);
const baseDir = path.dirname(absHtml);

const server = http.createServer((req, res) => {
  let filePath = path.join(baseDir, decodeURIComponent(url.parse(req.url).pathname));
  if (filePath === baseDir || filePath === baseDir + '/') filePath = absHtml;
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200);
    res.end(data);
  });
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const pageUrl = `http://127.0.0.1:${port}/index.html`;

  for (let i = 0; i < numSlides; i++) {
    const outFile = path.join(outDir, `slide_${String(i+1).padStart(2,'0')}.png`);
    // Inject JS to jump to slide i before screenshot
    const js = `document.querySelectorAll && (() => {
      const deck = document.getElementById('deck');
      const slides = deck ? deck.querySelectorAll('.slide') : [];
      const total = slides.length;
      if (deck) deck.style.transform = 'translateX(-${i * 100}vw)';
      document.body.classList.toggle('light-bg',
        slides[${i}] && slides[${i}].classList.contains('light'));
    })()`;
    const encodedJs = Buffer.from(js).toString('base64');
    try {
      execSync([
        `"${chrome}"`,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--window-size=1920,1080',
        `--screenshot="${path.resolve(outFile)}"`,
        `--run-all-compositor-stages-before-draw`,
        `--virtual-time-budget=3000`,
        pageUrl
      ].join(' '), { stdio: 'pipe' });
      // Chrome headless screenshot goes to cwd, rename if needed
      if (!fs.existsSync(outFile) && fs.existsSync('screenshot.png')) {
        fs.renameSync('screenshot.png', outFile);
      }
      console.log(`Captured slide ${i+1} → ${outFile}`);
    } catch(e) {
      console.error(`Slide ${i+1} failed:`, e.message.slice(0,120));
    }
  }

  server.close();
});
