const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src', function(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split('\n');
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('min-h-screen') || line.includes('min-h-[100dvh]')) {
             let origLine = line;
             lines[i] = line.replace(/className="([^"]*)"/, (match, p1) => {
                 let classes = p1.split(/\s+/);
                 classes = classes.filter(c => !c.startsWith('bg-') && !c.startsWith('from-') && !c.startsWith('to-'));
                 return 'className="' + classes.join(' ').trim() + '"';
             });
             if (origLine !== lines[i]) {
                 changed = true;
             }
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log('Updated', filePath);
    }
});
