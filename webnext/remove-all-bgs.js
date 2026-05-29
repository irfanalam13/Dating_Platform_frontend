const fs = require('fs');
const path = require('path');

const classesToRemove = new Set([
  'bg-white',
  'bg-white/90',
  'bg-white/95',
  'bg-white/80',
  'bg-white/50',
  'bg-[#FFF8F1]',
  'bg-[#FFF0F2]',
  'bg-gray-50',
  'bg-slate-50',
  'bg-[#F8EFE6]',
  'bg-slate-100',
  'dark:bg-zinc-900',
  'dark:bg-zinc-800',
  'dark:bg-gray-950',
  'dark:bg-gray-900'
]);

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/className="([^"]*)"/g, (match, p1) => {
        let classes = p1.split(/\s+/);
        classes = classes.filter(c => !classesToRemove.has(c));
        return 'className="' + classes.join(' ').trim() + '"';
    });

    content = content.replace(/className=\{`([^`]*)`\}/g, (match, p1) => {
        let parts = p1.split(/\s+/);
        parts = parts.filter(c => {
            if (c.includes('$')) return true;
            return !classesToRemove.has(c);
        });
        return 'className={`' + parts.join(' ').trim() + '`}';
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Cleaned backgrounds in:', filePath);
    }
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
            processFile(fullPath);
        }
    }
}

traverse('./src');
console.log('Finished removing backgrounds from all frontend pages.');
