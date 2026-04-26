import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\Gabriel\\OneDrive\\Área de Trabalho\\servyx\\app\\components\\OrdemServicoModule.tsx', 'utf8');
const lines = content.split('\n');

function checkDivBalance(startLine, endLine) {
    const str = lines.slice(startLine - 1, endLine).join('\n');
    const tags = str.match(/<div[\s>]/g) || [];
    const selfClosing = str.match(/<div[^>]*\/>/g) || [];
    const closing = str.match(/<\/div>/g) || [];
    return tags.length - selfClosing.length - closing.length;
}

console.log('1591 to 1994:', checkDivBalance(1591, 1994));
console.log('3174 to 3385:', checkDivBalance(3174, 3385));
