// Construit une copie minifiée de site/ dans dist/site/ (RGESN 6.2/6.3). Les sources restent lisibles dans site/.
// Usage : npm run build   (utilisé par le Dockerfile ; en local, `npm start` sert directement site/).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { transform } from 'esbuild';

const SRC = new URL('../site/', import.meta.url);
const OUT = new URL('../dist/site/', import.meta.url);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(SRC, OUT, { recursive: true }); // index.html, sw.js, manifeste, icône, carbon.txt… inchangés

// es2017 : compatible Samsung S7 et iPhone 8 (aucune syntaxe plus récente n'est introduite).
const js = await transform(readFileSync(new URL('app.js', SRC), 'utf8'), { minify: true, target: 'es2017', loader: 'js', legalComments: 'none' });
const css = await transform(readFileSync(new URL('style.css', SRC), 'utf8'), { minify: true, loader: 'css', legalComments: 'none' });
writeFileSync(new URL('app.js', OUT), js.code);
writeFileSync(new URL('style.css', OUT), css.code);

const size = (f) => readFileSync(new URL(f, SRC)).length;
const sizeOut = (f) => readFileSync(new URL(f, OUT)).length;
for (const f of ['app.js', 'style.css']) console.log(`${f}: ${size(f)} → ${sizeOut(f)} octets`);
