// Validated categorical palette (fixed order — never cycled/reassigned).
// See dataviz skill: passes CVD + normal-vision adjacent-pair checks.
export const CATEGORICAL = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
]

// Single-hue sequential ramp (light -> dark), ordinal steps for ordered stages/tiers.
export const SEQUENTIAL_BLUE = ['#9ec5f4', '#5598e7', '#256abf', '#184f95', '#0d366b']

export const CHART_INK = {
  primary: '#0f172a',
  secondary: '#475569',
  muted: '#94a3b8',
  grid: '#e2e8f0',
  axis: '#cbd5e1',
}

export const STATUS_COLOR = {
  paid: '#16a34a',
  pending: '#d97706',
  processing: '#2563eb',
  failed: '#dc2626',
  won: '#16a34a',
  lost: '#dc2626',
}

export const BRAND = '#f2611f'
export const BRAND_SOFT = '#ffc7a6'
