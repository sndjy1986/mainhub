import fs from 'fs';

const filePath = 'src/pages/ShiftReport.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const replacements = [
  { search: /bg-black\/20\/5/g, replace: 'bg-white/5' },
  { search: /bg-black\/20\/10/g, replace: 'bg-white/10' },
  { search: /bg-black\/20/g, replace: 'bg-white/5' } // All other bg-white replacements were just solid bg-white, which we can safely map to bg-white/5
];

for (const { search, replace } of replacements) {
  content = content.replace(search, replace);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed messed up colors in ShiftReport.tsx');
