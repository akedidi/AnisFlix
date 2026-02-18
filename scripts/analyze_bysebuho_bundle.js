
// Deep analysis of the video bundle to find how JWPlayer config is built
import fs from 'fs';

const bundle = fs.readFileSync('bysebuho_video_bundle.js', 'utf-8');
const id = '4m0a4it8eu6q';

console.log('=== Searching for JWPlayer setup patterns ===\n');

// Find context around "bafsd" 
const bafsdIdx = bundle.indexOf('bafsd');
if (bafsdIdx >= 0) {
    console.log('Context around bafsd:');
    console.log(bundle.substring(Math.max(0, bafsdIdx - 200), bafsdIdx + 500));
    console.log('\n---\n');
}

// Find context around "setup" (JWPlayer uses .setup())
const setupMatches = [];
let idx = 0;
while ((idx = bundle.indexOf('.setup(', idx)) >= 0) {
    setupMatches.push(bundle.substring(Math.max(0, idx - 100), idx + 300));
    idx++;
}
if (setupMatches.length > 0) {
    console.log(`Found ${setupMatches.length} .setup() calls:`);
    setupMatches.slice(0, 3).forEach((m, i) => {
        console.log(`\n--- Setup ${i + 1} ---`);
        console.log(m);
    });
}

// Find context around "sources" (JWPlayer config key)
const sourcesIdx = bundle.indexOf('"sources"');
if (sourcesIdx >= 0) {
    console.log('\nContext around "sources":');
    console.log(bundle.substring(Math.max(0, sourcesIdx - 200), sourcesIdx + 500));
}

// Find context around "file" key in player config
const fileMatches = [];
idx = 0;
const filePattern = /"file"\s*:/g;
let match;
while ((match = filePattern.exec(bundle)) !== null) {
    fileMatches.push(bundle.substring(Math.max(0, match.index - 100), match.index + 300));
}
if (fileMatches.length > 0) {
    console.log(`\nFound ${fileMatches.length} "file": patterns:`);
    fileMatches.slice(0, 3).forEach((m, i) => {
        console.log(`\n--- File ${i + 1} ---`);
        console.log(m);
    });
}

// Find context around "execute" (the API call function from index.js)
const executeIdx = bundle.indexOf('execute');
if (executeIdx >= 0) {
    console.log('\nContext around execute:');
    console.log(bundle.substring(Math.max(0, executeIdx - 100), executeIdx + 300));
}

// Search for operation names related to video
const opPattern = /operation\s*:\s*["']([^"']+)["']/g;
const ops = [];
while ((match = opPattern.exec(bundle)) !== null) {
    ops.push(match[1]);
}
console.log('\nAll operations found:', [...new Set(ops)]);

// Search for URL patterns in the bundle
const urlPattern = /["'](\/[a-z][a-z0-9_/-]*(?:\?[^"']*)?)['"]/g;
const urls = new Set();
while ((match = urlPattern.exec(bundle)) !== null) {
    const url = match[1];
    if (url.length > 3 && !url.includes('node_modules')) {
        urls.add(url);
    }
}
console.log('\nURL patterns found in video bundle:');
[...urls].slice(0, 30).forEach(u => console.log(' -', u));
