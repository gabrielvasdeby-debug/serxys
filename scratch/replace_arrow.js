const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/Gabriel/OneDrive/Área de Trabalho/servyx/app/components';

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('ArrowLeft')) {
      let newContent = content.replace(/\bArrowLeft\b/g, 'ChevronLeft');
      // Fix possible duplicates in the import list like "ChevronLeft, ChevronLeft"
      newContent = newContent.replace(/ChevronLeft,\s*ChevronLeft/g, 'ChevronLeft');
      fs.writeFileSync(fullPath, newContent);
      console.log('Updated ' + file);
    }
  }
});
