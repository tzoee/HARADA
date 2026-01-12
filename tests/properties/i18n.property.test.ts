import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import enMessages from '../../messages/en.json';
import idMessages from '../../messages/id.json';

/**
 * Feature: harada-pillars
 * Property 15: i18n Translation Completeness
 * 
 * For all UI string keys in the application:
 * - Both Indonesian (ID) and English (EN) translations SHALL exist
 * - No translation SHALL be empty or undefined
 * 
 * Validates: Requirements 10.2
 */
describe('Property 15: i18n Translation Completeness', () => {
  // Helper to get all keys from a nested object
  function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }

  // Helper to get value by dot-notation key
  function getValue(obj: Record<string, unknown>, key: string): unknown {
    const parts = key.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    
    return current;
  }

  const enKeys = getAllKeys(enMessages);
  const idKeys = getAllKeys(idMessages);

  describe('Translation key parity', () => {
    it('should have the same keys in both EN and ID translations', () => {
      const enKeySet = new Set(enKeys);
      const idKeySet = new Set(idKeys);

      // Check for keys in EN but not in ID
      const missingInId = enKeys.filter(key => !idKeySet.has(key));
      expect(missingInId).toEqual([]);

      // Check for keys in ID but not in EN
      const missingInEn = idKeys.filter(key => !enKeySet.has(key));
      expect(missingInEn).toEqual([]);
    });

    it('should have equal number of translation keys', () => {
      expect(enKeys.length).toBe(idKeys.length);
    });
  });

  describe('No empty translations', () => {
    it('should have non-empty values for all EN translations', () => {
      fc.assert(
        fc.property(fc.constantFrom(...enKeys), (key) => {
          const value = getValue(enMessages, key);
          expect(value).toBeDefined();
          expect(typeof value).toBe('string');
          expect((value as string).trim().length).toBeGreaterThan(0);
        })
      );
    });

    it('should have non-empty values for all ID translations', () => {
      fc.assert(
        fc.property(fc.constantFrom(...idKeys), (key) => {
          const value = getValue(idMessages, key);
          expect(value).toBeDefined();
          expect(typeof value).toBe('string');
          expect((value as string).trim().length).toBeGreaterThan(0);
        })
      );
    });
  });

  describe('Translation categories', () => {
    const categories = ['common', 'auth', 'canvas', 'tree', 'node', 'status', 'settings', 'errors', 'empty'];

    it('should have all required categories in EN', () => {
      categories.forEach(category => {
        expect(enMessages).toHaveProperty(category);
      });
    });

    it('should have all required categories in ID', () => {
      categories.forEach(category => {
        expect(idMessages).toHaveProperty(category);
      });
    });

    it('should have matching keys within each category', () => {
      fc.assert(
        fc.property(fc.constantFrom(...categories), (category) => {
          const enCategory = (enMessages as Record<string, Record<string, string>>)[category];
          const idCategory = (idMessages as Record<string, Record<string, string>>)[category];

          const enCategoryKeys = Object.keys(enCategory).sort();
          const idCategoryKeys = Object.keys(idCategory).sort();

          expect(enCategoryKeys).toEqual(idCategoryKeys);
        })
      );
    });
  });

  describe('Critical UI strings', () => {
    const criticalKeys = [
      'common.loading',
      'common.save',
      'common.cancel',
      'common.delete',
      'auth.signIn',
      'auth.signUp',
      'canvas.newCanvas',
      'tree.newMainGoal',
      'node.title',
      'status.done',
      'status.inProgress',
      'status.blocked',
      'errors.networkError',
      'errors.serverError',
    ];

    it('should have all critical keys in EN', () => {
      criticalKeys.forEach(key => {
        const value = getValue(enMessages, key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });

    it('should have all critical keys in ID', () => {
      criticalKeys.forEach(key => {
        const value = getValue(idMessages, key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });
  });
});
