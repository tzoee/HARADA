/**
 * Color Contrast Utilities for WCAG AA Compliance
 * 
 * WCAG AA requires:
 * - Normal text: contrast ratio of at least 4.5:1
 * - Large text (18pt+ or 14pt+ bold): contrast ratio of at least 3:1
 * - UI components and graphical objects: contrast ratio of at least 3:1
 */

/**
 * Calculate relative luminance of a color
 * @see https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @see https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const l1 = getRelativeLuminance(color1.r, color1.g, color1.b);
  const l2 = getRelativeLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}


/**
 * Check if contrast ratio meets WCAG AA for normal text (4.5:1)
 */
export function meetsWCAGAANormalText(ratio: number): boolean {
  return ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AA for large text (3:1)
 */
export function meetsWCAGAALargeText(ratio: number): boolean {
  return ratio >= 3;
}

/**
 * Check if contrast ratio meets WCAG AA for UI components (3:1)
 */
export function meetsWCAGAAUIComponent(ratio: number): boolean {
  return ratio >= 3;
}

/**
 * Color palette used in Harada Pillars with contrast verification
 */
export const colorPalette = {
  // Dark theme colors
  dark: {
    background: '#0f172a', // slate-900
    foreground: '#f8fafc', // slate-50
    muted: '#64748b', // slate-500
    mutedForeground: '#94a3b8', // slate-400
    card: '#1e293b', // slate-800
    cardForeground: '#f8fafc', // slate-50
    border: '#334155', // slate-700
    primary: '#3b82f6', // blue-500
    primaryForeground: '#ffffff',
    // Status colors
    done: '#22c55e', // green-500
    inProgress: '#3b82f6', // blue-500
    blocked: '#ef4444', // red-500
  },
  // Light theme colors
  light: {
    background: '#ffffff',
    foreground: '#0f172a', // slate-900
    muted: '#f1f5f9', // slate-100
    mutedForeground: '#64748b', // slate-500
    card: '#ffffff',
    cardForeground: '#0f172a', // slate-900
    border: '#e2e8f0', // slate-200
    primary: '#2563eb', // blue-600
    primaryForeground: '#ffffff',
    // Status colors
    done: '#16a34a', // green-600
    inProgress: '#2563eb', // blue-600
    blocked: '#dc2626', // red-600
  },
};

/**
 * Verify all color combinations meet WCAG AA standards
 */
export function verifyColorContrast(): {
  passed: boolean;
  results: Array<{
    theme: 'dark' | 'light';
    combination: string;
    ratio: number;
    required: number;
    passed: boolean;
  }>;
} {
  const results: Array<{
    theme: 'dark' | 'light';
    combination: string;
    ratio: number;
    required: number;
    passed: boolean;
  }> = [];

  // Test combinations for each theme
  for (const theme of ['dark', 'light'] as const) {
    const colors = colorPalette[theme];

    // Text on background (4.5:1 required)
    const textCombinations = [
      { name: 'foreground on background', fg: colors.foreground, bg: colors.background },
      { name: 'cardForeground on card', fg: colors.cardForeground, bg: colors.card },
      { name: 'mutedForeground on background', fg: colors.mutedForeground, bg: colors.background },
      { name: 'primaryForeground on primary', fg: colors.primaryForeground, bg: colors.primary },
    ];

    for (const combo of textCombinations) {
      const fgRgb = hexToRgb(combo.fg);
      const bgRgb = hexToRgb(combo.bg);
      if (fgRgb && bgRgb) {
        const ratio = getContrastRatio(fgRgb, bgRgb);
        results.push({
          theme,
          combination: combo.name,
          ratio: Math.round(ratio * 100) / 100,
          required: 4.5,
          passed: meetsWCAGAANormalText(ratio),
        });
      }
    }

    // Status colors on background (3:1 required for UI components)
    const statusCombinations = [
      { name: 'done on background', fg: colors.done, bg: colors.background },
      { name: 'inProgress on background', fg: colors.inProgress, bg: colors.background },
      { name: 'blocked on background', fg: colors.blocked, bg: colors.background },
      { name: 'done on card', fg: colors.done, bg: colors.card },
      { name: 'inProgress on card', fg: colors.inProgress, bg: colors.card },
      { name: 'blocked on card', fg: colors.blocked, bg: colors.card },
    ];

    for (const combo of statusCombinations) {
      const fgRgb = hexToRgb(combo.fg);
      const bgRgb = hexToRgb(combo.bg);
      if (fgRgb && bgRgb) {
        const ratio = getContrastRatio(fgRgb, bgRgb);
        results.push({
          theme,
          combination: combo.name,
          ratio: Math.round(ratio * 100) / 100,
          required: 3,
          passed: meetsWCAGAAUIComponent(ratio),
        });
      }
    }
  }

  return {
    passed: results.every((r) => r.passed),
    results,
  };
}
