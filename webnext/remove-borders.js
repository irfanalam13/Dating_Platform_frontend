const fs = require('fs');

const filePath = './src/features/profile/components/ProfileClient.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const classesToRemove = new Set([
  'border',
  'border-[#EADDD2]',
  'border-dashed',
  'border-[#7A2432]/40',
  'border-4',
  'border-white',
  'bg-white',
  'bg-[#FFF8F1]',
  'bg-[#FFF0F2]',
  'hover:bg-[#F8EFE6]',
  'bg-emerald-100',
  'bg-black/50', // for badges
  'bg-[#3F7D63]/90', // for verified
  'bg-[#3FC88A]/90' // for verified
]);

content = content.replace(/className="([^"]*)"/g, (match, p1) => {
    let classes = p1.split(/\s+/);
    classes = classes.filter(c => !classesToRemove.has(c));
    return 'className="' + classes.join(' ').trim() + '"';
});

// We also have className={`...`} in some places
content = content.replace(/className=\{`([^`]*)`\}/g, (match, p1) => {
    let parts = p1.split(/\s+/);
    parts = parts.filter(c => {
        // if it has $, it's a dynamic variable
        if (c.includes('$')) return true;
        return !classesToRemove.has(c);
    });
    return 'className={`' + parts.join(' ').trim() + '`}';
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Cleaned backgrounds and borders in ProfileClient.tsx');
