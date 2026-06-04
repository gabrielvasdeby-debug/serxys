import fs from 'fs/promises';
import path from 'path';

const searchDir = async (dir, fileList = []) => {
    const files = await fs.readdir(dir);
    for (const file of files) {
        const stat = await fs.stat(path.join(dir, file));
        if (stat.isDirectory() && !['node_modules', '.next', '.git', 'scratch'].includes(file)) {
            await searchDir(path.join(dir, file), fileList);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            fileList.push(path.join(dir, file));
        }
    }
    return fileList;
};

const extractProperties = async () => {
    const files = await searchDir('C:/Users/Gabriel/OneDrive/Área de Trabalho/servyx/app');
    const hookFiles = await searchDir('C:/Users/Gabriel/OneDrive/Área de Trabalho/servyx/hooks');
    const allFiles = [...files, ...hookFiles];

    const results = [];
    // Matches order.prop, order?.prop, orders[i].prop, orders[i]?.prop
    const regex = /\border(?:s(?:\[[^\]]+\]|\.\w+\(\w*\s*=>\s*\w*)?)?\.\??([a-zA-Z0-9_]+)(?:\.\??([a-zA-Z0-9_]+))?/g;

    for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, i) => {
            let match;
            while ((match = regex.exec(line)) !== null) {
                const prop1 = match[1];
                const prop2 = match[2];
                let fullProp = prop1;
                if (prop2) fullProp += '.' + prop2;
                
                if (!['map', 'filter', 'find', 'sort', 'length', 'push', 'reduce', 'slice', 'forEach', 'some', 'reverse', 'findIndex', 'includes'].includes(prop1)) {
                    results.push({
                        file: path.basename(file),
                        prop: fullProp,
                        line: i + 1,
                        content: line.trim()
                    });
                }
            }
        });
    }

    // Group by file and property
    const grouped = {};
    for (const res of results) {
        const key = `${res.file}|${res.prop}`;
        if (!grouped[key]) {
            grouped[key] = { file: res.file, prop: res.prop, count: 0, lines: [] };
        }
        grouped[key].count++;
        if (grouped[key].lines.length < 3) {
            grouped[key].lines.push(res.line);
        }
    }

    const output = Object.values(grouped).map(g => `${g.file} - order.${g.prop} (Lines: ${g.lines.join(', ')}${g.count > 3 ? '...' : ''})`);
    await fs.writeFile('C:/Users/Gabriel/OneDrive/Área de Trabalho/servyx/scratch/audit_output.txt', output.join('\n'));
    console.log(`Found ${output.length} unique property accesses across files.`);
};

extractProperties().catch(console.error);
