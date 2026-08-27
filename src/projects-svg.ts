import type { PinnedRepoNode } from './types.js';

interface Theme {
  bg: string;
  cardBg: string;
  border: string;
  title: string;
  description: string;
  muted: string;
  accent: string;
  hoverBorder: string;
  gradientFrom: string;
  gradientTo: string;
  linkColor: string;
}

const DARK: Theme = {
  bg: '#0d1117',
  cardBg: '#161b22',
  border: '#30363d',
  title: '#58a6ff',
  description: '#8b949e',
  muted: '#484f58',
  accent: '#58a6ff',
  hoverBorder: '#58a6ff',
  gradientFrom: '#58a6ff',
  gradientTo: '#bc8cff',
  linkColor: '#58a6ff',
};

const LIGHT: Theme = {
  bg: '#ffffff',
  cardBg: '#f6f8fa',
  border: '#d0d7de',
  title: '#0969da',
  description: '#656d76',
  muted: '#afb8c1',
  accent: '#0969da',
  hoverBorder: '#0969da',
  gradientFrom: '#0969da',
  gradientTo: '#8250df',
  linkColor: '#0969da',
};

/** Truncate text with ellipsis */
function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

function projectCard(repo: PinnedRepoNode, x: number, y: number, t: Theme, idx: number): string {
  const cardW = 370;
  const cardH = 120;
  const name = truncate(repo.name, 28);
  const desc = truncate(repo.description || 'No description', 65);
  const lang = repo.primaryLanguage;
  const langColor = lang?.color ?? t.muted;
  const langName = lang?.name ?? 'Unknown';
  const hasLive = !!repo.homepageUrl;

  return `
    <!-- Card ${idx + 1}: ${repo.name} -->
    <g transform="translate(${x}, ${y})">
      <!-- Card bg with hover-hint border -->
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="8" ry="8" fill="${t.cardBg}" stroke="${t.border}" stroke-width="1"/>

      <!-- Repo icon -->
      <text x="14" y="26" fill="${t.muted}" font-size="14" font-family="'Segoe UI', system-ui, sans-serif">📁</text>

      <!-- Repo name (clickable appearance) -->
      <a href="${repo.url}" target="_blank">
        <text x="34" y="27" fill="${t.title}" font-size="14" font-weight="600" font-family="'Segoe UI', system-ui, sans-serif" text-decoration="none">${name}</text>
      </a>

      ${hasLive ? `
      <!-- Live link badge -->
      <a href="${repo.homepageUrl}" target="_blank">
        <rect x="${cardW - 60}" y="12" width="46" height="18" rx="9" fill="${t.gradientFrom}" opacity="0.15"/>
        <text x="${cardW - 37}" y="24" fill="${t.accent}" font-size="9" font-weight="600" font-family="'Segoe UI', system-ui, sans-serif" text-anchor="middle">🔗 Live</text>
      </a>` : ''}

      <!-- Description -->
      <text x="14" y="52" fill="${t.description}" font-size="11" font-family="'Segoe UI', system-ui, sans-serif">${desc}</text>

      <!-- Bottom row: language + stars + forks -->
      <g transform="translate(14, 85)">
        <!-- Language dot + name -->
        <circle cx="5" cy="-3" r="5" fill="${langColor}"/>
        <text x="15" y="0" fill="${t.description}" font-size="11" font-family="'Segoe UI', system-ui, sans-serif">${langName}</text>

        <!-- Stars -->
        <text x="120" y="0" fill="${t.description}" font-size="11" font-family="'Segoe UI', system-ui, sans-serif">⭐ ${repo.stargazerCount}</text>

        <!-- Forks -->
        <text x="175" y="0" fill="${t.description}" font-size="11" font-family="'Segoe UI', system-ui, sans-serif">🍴 ${repo.forkCount}</text>
      </g>

      <!-- Top accent line -->
      <rect x="0" y="0" width="${cardW}" height="2" rx="1" fill="url(#proj_grad_${idx})"/>
    </g>`;
}

export function generateProjectsSvg(repos: PinnedRepoNode[], mode: 'dark' | 'light'): string {
  const t = mode === 'dark' ? DARK : LIGHT;

  if (repos.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="60" viewBox="0 0 760 60">
      <text x="380" y="30" fill="${t.description}" font-size="14" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif">No pinned repositories found</text>
    </svg>`;
  }

  const cardW = 370;
  const cardH = 120;
  const gap = 20;
  const cols = 2;
  const rows = Math.ceil(repos.length / cols);
  const svgW = cols * cardW + gap;
  const titleH = 50;
  const svgH = titleH + rows * (cardH + gap);

  const gradients = repos
    .map(
      (_, i) =>
        `<linearGradient id="proj_grad_${i}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${t.gradientFrom}"/>
      <stop offset="100%" stop-color="${t.gradientTo}"/>
    </linearGradient>`,
    )
    .join('\n    ');

  const cards = repos
    .map((repo, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cardW + gap);
      const y = titleH + row * (cardH + gap);
      return projectCard(repo, x, y, t, i);
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" fill="none">
  <defs>
    ${gradients}
  </defs>

  <!-- Section title -->
  <text x="${svgW / 2}" y="30" fill="${t.title}" font-size="18" font-weight="700" font-family="'Segoe UI', system-ui, sans-serif" text-anchor="middle">📌 Featured Projects</text>

  ${cards}
</svg>`;
}
