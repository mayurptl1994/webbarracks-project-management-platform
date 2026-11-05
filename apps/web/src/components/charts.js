/**
 * Pure Vanilla SVG Chart Generators (No external libraries)
 */

export function renderBarChart(data, options = {}) {
  const width = options.width || 500;
  const height = options.height || 220;
  const padding = 30;

  if (!data || data.length === 0) {
    return `<div style="height: ${height}px; display: flex; align-items: center; justify-content: center; color: var(--text-muted);">No chart data available</div>`;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 10);
  const barWidth = Math.max(12, Math.floor((width - padding * 2) / data.length) - 12);

  const bars = data
    .map((item, index) => {
      const barHeight = Math.max(4, Math.round((item.value / maxValue) * (height - padding * 2)));
      const x = padding + index * (barWidth + 12);
      const y = height - padding - barHeight;

      return `
      <g class="chart-bar-group">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="var(--text-primary)" opacity="0.9">
          <title>${item.label}: ${item.value}</title>
        </rect>
        <text x="${x + barWidth / 2}" y="${height - 10}" font-size="11" fill="var(--text-muted)" text-anchor="middle">
          ${item.label.slice(0, 7)}
        </text>
        <text x="${x + barWidth / 2}" y="${y - 6}" font-size="11" font-weight="600" fill="var(--text-secondary)" text-anchor="middle">
          ${item.value}
        </text>
      </g>
    `;
    })
    .join('');

  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border-default)" stroke-width="1"/>
      ${bars}
    </svg>
  `;
}

export function renderDonutChart(data, options = {}) {
  const size = options.size || 180;
  const strokeWidth = options.strokeWidth || 28;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  let accumulatedAngle = 0;

  const colors = ['var(--text-primary)', 'var(--text-muted)', 'var(--border-strong)', 'var(--border-default)'];

  const segments = data
    .map((item, i) => {
      const percent = item.value / total;
      const strokeDasharray = `${circumference * percent} ${circumference}`;
      const strokeDashoffset = -circumference * accumulatedAngle;
      accumulatedAngle += percent;

      return `
      <circle
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="transparent"
        stroke="${item.color || colors[i % colors.length]}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDasharray}"
        stroke-dashoffset="${strokeDashoffset}"
      >
        <title>${item.label}: ${item.value} (${Math.round(percent * 100)}%)</title>
      </circle>
    `;
    })
    .join('');

  return `
    <div style="display: flex; align-items: center; gap: 1.5rem;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg); transform-origin: 50% 50%;">
        ${segments}
      </svg>
      <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.8125rem;">
        ${data
          .map(
            (d, i) => `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="width: 10px; height: 10px; border-radius: 2px; background: ${d.color || colors[i % colors.length]};"></span>
            <span style="color: var(--text-secondary);">${d.label}:</span>
            <strong style="font-weight: 600;">${d.value}</strong>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

