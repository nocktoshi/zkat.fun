import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.jpeg':'image/jpeg'};
const assets={};
for(const name of readdirSync('public')){
  const extension=name.slice(name.lastIndexOf('.'));
  if(!types[extension])throw new Error('Unknown public asset '+name);
  assets['/'+name]={type:types[extension],data:readFileSync('public/'+name).toString('base64')};
}
mkdirSync('dist/server',{recursive:true});
writeFileSync('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+readFileSync('worker.js','utf8'));
console.log('Built ZKat: self-contained Worker, live rewards endpoint, and all public assets.');
