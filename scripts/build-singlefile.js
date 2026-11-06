import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'apps/web/dist');
const assetsDir = path.resolve(distDir, 'assets');

// 1. Locate built CSS and JS files
const files = fs.readdirSync(assetsDir);
const cssFile = files.find((f) => f.endsWith('.css'));
const jsFile = files.find((f) => f.endsWith('.js'));

if (!cssFile || !jsFile) {
  console.error('Could not find built CSS or JS in dist/assets!');
  process.exit(1);
}

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');

// 2. Escape closing script tags to avoid HTML parser termination
const safeJs = jsContent.replace(/<\/script/gi, '<\\/script');

// 3. Assemble complete standalone HTML
const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Web Barracks — Advanced Application UI, Authentication &amp; Tracking System</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>
${cssContent}
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
${safeJs}
    </script>
  </body>
</html>`;

// 4. Write to dist/index.html and project root index.html
fs.writeFileSync(path.join(distDir, 'index.html'), standaloneHtml, 'utf8');
fs.writeFileSync(path.join(rootDir, 'index.html'), standaloneHtml, 'utf8');

console.log('✓ Successfully created 100% standalone index.html:');
console.log('  - ' + path.join(rootDir, 'index.html'));
console.log('  - ' + path.join(distDir, 'index.html'));
console.log(`✓ Total bundle size: ${Math.round(standaloneHtml.length / 1024)} KB`);
