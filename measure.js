const { performance } = require('perf_hooks');

async function benchmark(label, fn) {
  const start = performance.now();
  await fn();
  const end = performance.now();
  console.log(`${label}: ${(end - start).toFixed(4)} ms`);
}

async function run() {
  const responses = Array.from({ length: 1000 }, (_, i) => ({
    status: 200,
    json: async () => {
      // simulate some async work
      await new Promise(r => setTimeout(r, 1));
      return { success: true };
    }
  }));

  await benchmark('forEach (buggy)', async () => {
    responses.forEach(async (response) => {
      if (response.status !== 200) throw new Error();
      const data = await response.json();
      if (!data.success) throw new Error();
    });
  });

  await benchmark('for...of (sequential)', async () => {
    for (const response of responses) {
      if (response.status !== 200) throw new Error();
      const data = await response.json();
      if (!data.success) throw new Error();
    }
  });

  await benchmark('Promise.all + map (parallel)', async () => {
    await Promise.all(responses.map(async (response) => {
      if (response.status !== 200) throw new Error();
      const data = await response.json();
      if (!data.success) throw new Error();
    }));
  });
}

run();
