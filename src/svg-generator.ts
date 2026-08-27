import type { UserStats } from './types.js';

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

interface Theme {
  bg: string;
  cardBg: string;
  border: string;
  title: string;
  label: string;
  value: string;
  accent: string;
  accentAlt: string;
  muted: string;
  divider: string;
  shadow: string;
  gradientFrom: string;
  gradientTo: string;
  addColor: string;
  delColor: string;
}

const DARK: Theme = {
  bg: '#0d1117',
  cardBg: '#161b22',
  border: '#30363d',
  title: '#f0f6fc',
  label: '#8b949e',
  value: '#e6edf3',
  accent: '#58a6ff',
  accentAlt: '#bc8cff',
  muted: '#484f58',
  divider: '#21262d',
  shadow: 'rgba(0,0,0,0.4)',
  gradientFrom: '#58a6ff',
  gradientTo: '#bc8cff',
  addColor: '#3fb950',
  delColor: '#f85149',
};

const LIGHT: Theme = {
  bg: '#ffffff',
  cardBg: '#f6f8fa',
  border: '#d0d7de',
  title: '#1f2328',
  label: '#656d76',
  value: '#1f2328',
  accent: '#0969da',
  accentAlt: '#8250df',
  muted: '#afb8c1',
  divider: '#d8dee4',
  shadow: 'rgba(31,35,40,0.12)',
  gradientFrom: '#0969da',
  gradientTo: '#8250df',
  addColor: '#1a7f37',
  delColor: '#cf222e',
};

function statRow(label: string, value: string, icon: string, y: number, t: Theme): string {
  return `
    <g transform="translate(0, ${y})">
      <text x="32" y="0" fill="${t.label}" font-size="13" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" dominant-baseline="middle">${icon}  ${label}</text>
      <text x="368" y="0" fill="${t.value}" font-size="13" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" font-weight="600" text-anchor="end" dominant-baseline="middle">${value}</text>
    </g>`;
}

function dotLine(label: string, value: string, totalLen: number): { label: string; value: string; dots: string } {
  const dotsNeeded = Math.max(0, totalLen - label.length - value.length);
  let dots: string;
  if (dotsNeeded <= 2) {
    dots = dotsNeeded === 0 ? '' : dotsNeeded === 1 ? ' ' : '. ';
  } else {
    dots = ' ' + '.'.repeat(dotsNeeded) + ' ';
  }
  return { label, value, dots };
}

export function generateStatsSvg(stats: UserStats, mode: 'dark' | 'light'): string {
  const t = mode === 'dark' ? DARK : LIGHT;

  const rows: Array<{ icon: string; label: string; value: string }> = [
    { icon: '🎂', label: 'Age', value: stats.age },
    { icon: '📝', label: 'Total Commits', value: fmt(stats.totalCommits) },
    { icon: '⭐', label: 'Total Stars', value: fmt(stats.totalStars) },
    { icon: '📦', label: 'Owned Repositories', value: fmt(stats.totalRepos) },
    { icon: '🤝', label: 'Contributed To', value: fmt(stats.totalContribRepos) },
    { icon: '👥', label: 'Followers', value: fmt(stats.followers) },
    { icon: '📏', label: 'Lines of Code', value: fmt(stats.locNet) },
    { icon: '➕', label: 'Lines Added', value: `+${fmt(stats.locAdded)}` },
    { icon: '➖', label: 'Lines Deleted', value: `-${fmt(stats.locDeleted)}` },
  ];

  const rowHeight = 30;
  const startY = 108;
  const svgHeight = startY + rows.length * rowHeight + 30;

  const statRows = rows
    .map((r, i) => statRow(r.label, r.value, r.icon, startY + i * rowHeight, t))
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="${svgHeight}" viewBox="0 0 400 ${svgHeight}" fill="none">
  <defs>
    <linearGradient id="grad_${mode}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.gradientFrom}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${t.gradientTo}" stop-opacity="0.05"/>
    </linearGradient>
    <clipPath id="avatar_clip_${mode}">
      <circle cx="40" cy="44" r="24"/>
    </clipPath>
    <filter id="shadow_${mode}">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="${t.shadow}" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Card background -->
  <rect x="0.5" y="0.5" width="399" height="${svgHeight - 1}" rx="12" ry="12" fill="${t.cardBg}" stroke="${t.border}" stroke-width="1"/>
  <rect x="0.5" y="0.5" width="399" height="${svgHeight - 1}" rx="12" ry="12" fill="url(#grad_${mode})"/>

  <!-- Avatar -->
  <g filter="url(#shadow_${mode})">
    <circle cx="40" cy="44" r="25" fill="${t.border}" stroke="${t.accent}" stroke-width="2"/>
    <image x="16" y="20" width="48" height="48" clip-path="url(#avatar_clip_${mode})" href="${stats.avatarUrl}" preserveAspectRatio="xMidYMid slice"/>
  </g>

  <!-- Title -->
  <text x="76" y="38" fill="${t.title}" font-size="16" font-weight="700" font-family="'Segoe UI', system-ui, -apple-system, sans-serif">Dhruva Singh's GitHub Stats</text>
  <text x="76" y="58" fill="${t.label}" font-size="11" font-family="'Segoe UI', system-ui, -apple-system, sans-serif">@DhruvaSingh12</text>

  <!-- Gradient underline -->
  <rect x="20" y="78" width="360" height="2" rx="1">
    <animate attributeName="width" from="0" to="360" dur="0.8s" fill="freeze"/>
  </rect>
  <rect x="20" y="78" width="360" height="2" rx="1" fill="url(#grad_${mode})"/>

  <!-- Stats rows -->
  ${statRows}

  <!-- Animated accent bar at top -->
  <rect x="0" y="0" width="400" height="3" rx="1.5" fill="url(#grad_${mode})">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite"/>
  </rect>
</svg>`;
}
