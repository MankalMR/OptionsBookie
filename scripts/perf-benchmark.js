
const { performance } = require('perf_hooks');

function benchmark() {
  const numItems = 1000;
  const numLookups = 100000;

  const items = Array.from({ length: numItems }, (_, i) => ({
    id: `id-${i}`,
    name: `name-${i}`
  }));

  const itemMap = new Map(items.map(item => [item.id, item]));

  const lookupIds = Array.from({ length: numLookups }, () => `id-${Math.floor(Math.random() * numItems)}`);

  console.log(`Benchmarking ${numLookups} lookups in an array of ${numItems} items...`);

  // Array.find
  const startArray = performance.now();
  for (const id of lookupIds) {
    const item = items.find(i => i.id === id);
  }
  const endArray = performance.now();
  console.log(`Array.find: ${(endArray - startArray).toFixed(2)}ms`);

  // Map.get
  const startMap = performance.now();
  for (const id of lookupIds) {
    const item = itemMap.get(id);
  }
  const endMap = performance.now();
  console.log(`Map.get: ${(endMap - startMap).toFixed(2)}ms`);

  console.log(`Improvement: ${((endArray - startArray) / (endMap - startMap)).toFixed(2)}x`);
}

benchmark();
