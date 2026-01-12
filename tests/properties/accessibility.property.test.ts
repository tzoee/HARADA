import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  getRelativeLuminance,
  getContrastRatio,
  hexToRgb,
  meetsWCAGAANormalText,
  meetsWCAGAALargeText,
  meetsWCAGAAUIComponent,
  verifyColorContrast,
  colorPalette,
} from '@/lib/accessibility/color-contrast';

/**
 * Feature: harada-pillars
 * Property: Color Contrast WCAG AA Compliance
 * 
 * For all color combinations in the application:
 * - Text on background SHALL have contrast ratio >= 4.5:1
 * - Large text on background SHALL have contrast ratio >= 3:1
 * - UI components SHALL have contrast ratio >= 3:1
 * 
 * Validates: Requirements 17.5
 */
describe('Color Contrast WCAG AA Compliance', () => {
  describe('Relative luminance calculation', () => {
    it('should return 0 for black', () => {
      const luminance = getRelativeLuminance(0, 0, 0);
      expect(luminance).toBe(0);
    });

    it('should return 1 for white', () => {
      const luminance = getRelativeLuminance(255, 255, 255);
      expect(luminance).toBeCloseTo(1, 5);
    });

    it('should return value between 0 and 1 for any color', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          (r, g, b) => {
            const luminance = getRelativeLuminance(r, g, b);
            expect(luminance).toBeGreaterThanOrEqual(0);
            expect(luminance).toBeLessThanOrEqual(1);
          }
        )
      );
    });
  });


  describe('Contrast ratio calculation', () => {
    it('should return 21:1 for black on white', () => {
      const ratio = getContrastRatio(
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 }
      );
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should return 1:1 for same colors', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          (r, g, b) => {
            const ratio = getContrastRatio({ r, g, b }, { r, g, b });
            expect(ratio).toBeCloseTo(1, 5);
          }
        )
      );
    });

    it('should be symmetric (order of colors does not matter)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          (r1, g1, b1, r2, g2, b2) => {
            const ratio1 = getContrastRatio({ r: r1, g: g1, b: b1 }, { r: r2, g: g2, b: b2 });
            const ratio2 = getContrastRatio({ r: r2, g: g2, b: b2 }, { r: r1, g: g1, b: b1 });
            expect(ratio1).toBeCloseTo(ratio2, 10);
          }
        )
      );
    });

    it('should return ratio >= 1 for any color combination', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          (r1, g1, b1, r2, g2, b2) => {
            const ratio = getContrastRatio({ r: r1, g: g1, b: b1 }, { r: r2, g: g2, b: b2 });
            expect(ratio).toBeGreaterThanOrEqual(1);
          }
        )
      );
    });
  });

  describe('Hex to RGB conversion', () => {
    it('should parse valid hex colors', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should handle hex without # prefix', () => {
      expect(hexToRgb('ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should return null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#gg0000')).toBeNull();
    });
  });

  describe('WCAG AA thresholds', () => {
    it('should pass normal text at 4.5:1 ratio', () => {
      expect(meetsWCAGAANormalText(4.5)).toBe(true);
      expect(meetsWCAGAANormalText(4.49)).toBe(false);
      expect(meetsWCAGAANormalText(21)).toBe(true);
    });

    it('should pass large text at 3:1 ratio', () => {
      expect(meetsWCAGAALargeText(3)).toBe(true);
      expect(meetsWCAGAALargeText(2.99)).toBe(false);
      expect(meetsWCAGAALargeText(21)).toBe(true);
    });

    it('should pass UI components at 3:1 ratio', () => {
      expect(meetsWCAGAAUIComponent(3)).toBe(true);
      expect(meetsWCAGAAUIComponent(2.99)).toBe(false);
      expect(meetsWCAGAAUIComponent(21)).toBe(true);
    });
  });


  describe('Application color palette verification', () => {
    it('should have all dark theme colors pass WCAG AA', () => {
      const verification = verifyColorContrast();
      const darkResults = verification.results.filter(r => r.theme === 'dark');
      
      darkResults.forEach(result => {
        expect(result.passed).toBe(true);
      });
    });

    it('should have all light theme colors pass WCAG AA', () => {
      const verification = verifyColorContrast();
      const lightResults = verification.results.filter(r => r.theme === 'light');
      
      lightResults.forEach(result => {
        expect(result.passed).toBe(true);
      });
    });

    it('should pass overall verification', () => {
      const verification = verifyColorContrast();
      expect(verification.passed).toBe(true);
    });

    it('should verify foreground on background meets 4.5:1', () => {
      // Dark theme
      const darkFg = hexToRgb(colorPalette.dark.foreground)!;
      const darkBg = hexToRgb(colorPalette.dark.background)!;
      const darkRatio = getContrastRatio(darkFg, darkBg);
      expect(darkRatio).toBeGreaterThanOrEqual(4.5);

      // Light theme
      const lightFg = hexToRgb(colorPalette.light.foreground)!;
      const lightBg = hexToRgb(colorPalette.light.background)!;
      const lightRatio = getContrastRatio(lightFg, lightBg);
      expect(lightRatio).toBeGreaterThanOrEqual(4.5);
    });

    it('should verify status colors meet 3:1 for UI components', () => {
      const themes = ['dark', 'light'] as const;
      const statusColors = ['done', 'inProgress', 'blocked'] as const;

      for (const theme of themes) {
        const bg = hexToRgb(colorPalette[theme].background)!;
        
        for (const status of statusColors) {
          const statusColor = hexToRgb(colorPalette[theme][status])!;
          const ratio = getContrastRatio(statusColor, bg);
          expect(ratio).toBeGreaterThanOrEqual(3);
        }
      }
    });
  });

  describe('Color palette completeness', () => {
    it('should have all required colors in dark theme', () => {
      const requiredColors = [
        'background', 'foreground', 'muted', 'mutedForeground',
        'card', 'cardForeground', 'border', 'primary', 'primaryForeground',
        'done', 'inProgress', 'blocked'
      ];

      requiredColors.forEach(color => {
        expect(colorPalette.dark).toHaveProperty(color);
      });
    });

    it('should have all required colors in light theme', () => {
      const requiredColors = [
        'background', 'foreground', 'muted', 'mutedForeground',
        'card', 'cardForeground', 'border', 'primary', 'primaryForeground',
        'done', 'inProgress', 'blocked'
      ];

      requiredColors.forEach(color => {
        expect(colorPalette.light).toHaveProperty(color);
      });
    });

    it('should have valid hex colors', () => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;

      for (const theme of ['dark', 'light'] as const) {
        for (const [, value] of Object.entries(colorPalette[theme])) {
          expect(value).toMatch(hexRegex);
        }
      }
    });
  });
});
