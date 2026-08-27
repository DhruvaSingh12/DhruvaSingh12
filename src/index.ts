import { mkdirSync, writeFileSync } from 'node:fs';
import { fetchAllStats } from './stats.js';
import { generateStatsSvg } from './svg-generator.js';
import { generateProjectsSvg } from './projects-svg.js';
import { QUERY_COUNT } from './graphql.js';

async function main(): Promise<void> {
  const start = performance.now();

  const stats = await fetchAllStats();

  // Generate SVGs
  const statsDark = generateStatsSvg(stats, 'dark');
  const statsLight = generateStatsSvg(stats, 'light');
  const projectsDark = generateProjectsSvg(stats.pinnedRepos, 'dark');
  const projectsLight = generateProjectsSvg(stats.pinnedRepos, 'light');

  // Write output
  mkdirSync('output', { recursive: true });
  writeFileSync('output/stats-dark.svg', statsDark, 'utf-8');
  writeFileSync('output/stats-light.svg', statsLight, 'utf-8');
  writeFileSync('output/projects-dark.svg', projectsDark, 'utf-8');
  writeFileSync('output/projects-light.svg', projectsLight, 'utf-8');

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`⏱  Total time: ${elapsed}s`);
  console.log(`📡 Total GraphQL API calls: ${Object.values(QUERY_COUNT).reduce((a, b) => a + b, 0)}`);
  for (const [name, count] of Object.entries(QUERY_COUNT)) {
    console.log(`   ${name}: ${count}`);
  }
  console.log('\n📁 Output written to output/ directory:');
  console.log('   • stats-dark.svg / stats-light.svg');
  console.log('   • projects-dark.svg / projects-light.svg');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
