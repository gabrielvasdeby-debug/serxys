const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) {
        files = files.concat(walk(p));
      } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
        files.push(p);
      }
    });
  } catch (e) {}
  return files;
}

const files = walk('./app').concat(walk('./hooks')).concat(walk('./components'));
const badFiles = [];
files.forEach(f => {
  const c = fs.readFileSync(f, 'utf-8');
  if (c.includes('useEffect') && !c.includes('React.useEffect') && !c.match(/import.*useEffect.*from.*['"`]react['"`]/)) {
    badFiles.push(f);
  }
});
console.log(badFiles.join('\n'));
