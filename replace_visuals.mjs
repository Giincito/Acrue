import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) results.push(filePath);
    }
  });
  return results;
}

const files = walk('./src');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content
    // Replace heavy font weights with font-medium (500)
    .replace(/font-semibold/g, 'font-medium')
    .replace(/font-bold/g, 'font-medium')
    .replace(/font-extrabold/g, 'font-medium')
    // Replace headings to match Design.md
    // Heading 1: 24px weight 300, tracking -0.03em
    .replace(/text-3xl font-medium tracking-tight/g, 'text-[24px] font-light tracking-[-0.03em]')
    .replace(/text-2xl font-medium tracking-tight/g, 'text-[24px] font-light tracking-[-0.03em]')
    // Replace hard borders with 0.5px
    .replace(/border-2/g, 'border-[0.5px]')
    .replace(/border-4/g, 'border-[0.5px]')
    // Replace heavy shadows with shadow-sm
    .replace(/shadow-md/g, 'shadow-sm')
    .replace(/shadow-lg/g, 'shadow-sm')
    .replace(/shadow-xl/g, 'shadow-sm')
    .replace(/shadow-2xl/g, 'shadow-sm');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log('Updated ' + file);
    changedFiles++;
  }
});

console.log(`Updated ${changedFiles} files.`);
