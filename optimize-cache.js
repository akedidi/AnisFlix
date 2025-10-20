// Script to optimize all useQuery calls with cache options
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/hooks/useTMDB.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Add cache options to all useQuery calls that don't already have them
const useQueryRegex = /useQuery\(\{([^}]+)\}\);/g;

content = content.replace(useQueryRegex, (match, queryContent) => {
  // Skip if already has cache options
  if (queryContent.includes('CACHE_OPTIONS') || queryContent.includes('staleTime')) {
    return match;
  }
  
  // Add cache options
  return `useQuery({
    ${queryContent.trim()},
    ...CACHE_OPTIONS,
  });`;
});

fs.writeFileSync(filePath, content);
console.log('✅ Cache options applied to all useQuery calls');
