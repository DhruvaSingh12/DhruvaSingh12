import { readFileSync } from 'node:fs';
import type { UserStats } from './types.js';

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

// Replaces the value inside <tspan id="element_id">...</tspan> with newText.
function findAndReplace(svg: string, elementId: string, newText: string): string {
  const regex = new RegExp(`(<tspan[^>]*id="${elementId}"[^>]*>).*?(</tspan>)`, 'g');
  return svg.replace(regex, `$1${newText}$2`);
}

// Replaces the value and justifies the preceding dots to keep layout alignment.
function justifyFormat(svg: string, elementId: string, newText: string | number, length: number = 0): string {
  if (typeof newText === 'number') {
    newText = fmt(newText);
  }
  newText = String(newText);

  // 1. Replace the actual value
  let updatedSvg = findAndReplace(svg, elementId, newText);

  // 2. Adjust the dots
  const justLen = Math.max(0, length - newText.length);
  let dotString = '';
  if (justLen <= 2) {
    if (justLen === 1) dotString = ' ';
    if (justLen === 2) dotString = '. ';
  } else {
    dotString = ' ' + '.'.repeat(justLen) + ' ';
  }

  updatedSvg = findAndReplace(updatedSvg, `${elementId}_dots`, dotString);
  return updatedSvg;
}

export function generateStatsSvg(stats: UserStats, mode: 'dark' | 'light'): string {
  // Read the appropriate template file
  const templatePath = mode === 'dark' ? 'dark_mode.svg' : 'light_mode.svg';
  let svg = readFileSync(templatePath, 'utf-8');

  // Replace stats and justify dots
  svg = justifyFormat(svg, 'age_data', stats.age, 49);
  svg = justifyFormat(svg, 'commit_data', stats.totalCommits, 22);
  svg = justifyFormat(svg, 'star_data', stats.totalStars, 14);
  svg = justifyFormat(svg, 'repo_data', stats.totalRepos, 6);
  svg = justifyFormat(svg, 'contrib_data', stats.totalContribRepos); // No dots adjustment for this one
  svg = justifyFormat(svg, 'follower_data', stats.followers, 10);

  svg = justifyFormat(svg, 'loc_data', stats.locNet, 9);
  svg = justifyFormat(svg, 'loc_add', stats.locAdded); // no length needed, handled differently in original
  svg = justifyFormat(svg, 'loc_del', stats.locDeleted, 7);

  return svg;
}
