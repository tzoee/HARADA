import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { signUpSchema, signInSchema } from '@/lib/validations/auth';

/**
 * Feature: harada-pillars
 * Property 19: Authentication Input Validation
 * 
 * For any registration attempt with invalid data:
 * - Empty email SHALL be rejected
 * - Invalid email format SHALL be rejected
 * - Password shorter than 8 characters SHALL be rejected
 * - Appropriate error messages SHALL be displayed
 * 
 * Validates: Requirements 1.3
 */
describe('Property 19: Authentication Input Validation', () => {
  // Valid email arbitrary
  const validEmailArb = fc.emailAddress();
  
  // Invalid email arbitrary (strings that are not valid emails)
  const invalidEmailArb = fc.oneof(
    fc.constant(''),
    fc.constant('notanemail'),
    fc.constant('missing@'),
    fc.constant('@nodomain.com'),
    fc.constant('spaces in@email.com'),
    fc.string().filter(s => !s.includes('@') || s.length < 3)
  );

  // Valid password arbitrary (8-100 chars)
  const validPasswordArb = fc.string({ minLength: 8, maxLength: 100 });
  
  // Short password arbitrary (less than 8 chars)
  const shortPasswordArb = fc.string({ minLength: 0, maxLength: 7 });

  describe('Sign Up Validation', () => {
    describe('Email validation', () => {
      it('should accept valid email addresses', () => {
        fc.assert(
          fc.property(validEmailArb, validPasswordArb, (email, password) => {
            const result = signUpSchema.safeParse({ email, password });
            // If it fails, it should not be due to email
            if (!result.success) {
              const emailErrors = result.error.errors.filter(e => e.path.includes('email'));
              expect(emailErrors.length).toBe(0);
            }
          })
        );
      });

      it('should reject empty email', () => {
        fc.assert(
          fc.property(validPasswordArb, (password) => {
            const result = signUpSchema.safeParse({ email: '', password });
            expect(result.success).toBe(false);
            if (!result.success) {
              const hasEmailError = result.error.errors.some(e => e.path.includes('email'));
              expect(hasEmailError).toBe(true);
            }
          })
        );
      });

      it('should reject invalid email formats', () => {
        fc.assert(
          fc.property(invalidEmailArb, validPasswordArb, (email, password) => {
            const result = signUpSchema.safeParse({ email, password });
            expect(result.success).toBe(false);
          })
        );
      });
    });

    describe('Password validation', () => {
      it('should accept passwords with 8+ characters', () => {
        fc.assert(
          fc.property(validEmailArb, validPasswordArb, (email, password) => {
            const result = signUpSchema.safeParse({ email, password });
            // If it fails, it should not be due to password length
            if (!result.success) {
              const passwordLengthErrors = result.error.errors.filter(
                e => e.path.includes('password') && e.message.includes('8')
              );
              expect(passwordLengthErrors.length).toBe(0);
            }
          })
        );
      });

      it('should reject passwords shorter than 8 characters', () => {
        fc.assert(
          fc.property(validEmailArb, shortPasswordArb, (email, password) => {
            const result = signUpSchema.safeParse({ email, password });
            expect(result.success).toBe(false);
            if (!result.success) {
              const hasPasswordError = result.error.errors.some(e => e.path.includes('password'));
              expect(hasPasswordError).toBe(true);
            }
          })
        );
      });

      it('should reject empty password', () => {
        fc.assert(
          fc.property(validEmailArb, (email) => {
            const result = signUpSchema.safeParse({ email, password: '' });
            expect(result.success).toBe(false);
          })
        );
      });
    });

    describe('Combined validation', () => {
      it('should accept valid email and password combination', () => {
        fc.assert(
          fc.property(validEmailArb, validPasswordArb, (email, password) => {
            const result = signUpSchema.safeParse({ email, password });
            expect(result.success).toBe(true);
          })
        );
      });

      it('should reject when both email and password are invalid', () => {
        fc.assert(
          fc.property(invalidEmailArb, shortPasswordArb, (email, password) => {
            const result = signUpSchema.safeParse({ email, password });
            expect(result.success).toBe(false);
          })
        );
      });
    });
  });

  describe('Sign In Validation', () => {
    describe('Email validation', () => {
      it('should accept valid email addresses', () => {
        fc.assert(
          fc.property(validEmailArb, fc.string({ minLength: 1 }), (email, password) => {
            const result = signInSchema.safeParse({ email, password });
            if (!result.success) {
              const emailErrors = result.error.errors.filter(e => e.path.includes('email'));
              expect(emailErrors.length).toBe(0);
            }
          })
        );
      });

      it('should reject empty email', () => {
        fc.assert(
          fc.property(fc.string({ minLength: 1 }), (password) => {
            const result = signInSchema.safeParse({ email: '', password });
            expect(result.success).toBe(false);
          })
        );
      });
    });

    describe('Password validation', () => {
      it('should accept any non-empty password for sign in', () => {
        fc.assert(
          fc.property(validEmailArb, fc.string({ minLength: 1 }), (email, password) => {
            const result = signInSchema.safeParse({ email, password });
            expect(result.success).toBe(true);
          })
        );
      });

      it('should reject empty password', () => {
        fc.assert(
          fc.property(validEmailArb, (email) => {
            const result = signInSchema.safeParse({ email, password: '' });
            expect(result.success).toBe(false);
          })
        );
      });
    });
  });

  describe('Error messages', () => {
    it('should provide appropriate error message for empty email', () => {
      const result = signUpSchema.safeParse({ email: '', password: 'validpassword123' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.errors.find(e => e.path.includes('email'));
        expect(emailError).toBeDefined();
        expect(emailError?.message).toBeTruthy();
      }
    });

    it('should provide appropriate error message for invalid email', () => {
      const result = signUpSchema.safeParse({ email: 'notanemail', password: 'validpassword123' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.errors.find(e => e.path.includes('email'));
        expect(emailError).toBeDefined();
        expect(emailError?.message).toContain('email');
      }
    });

    it('should provide appropriate error message for short password', () => {
      const result = signUpSchema.safeParse({ email: 'test@example.com', password: 'short' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.errors.find(e => e.path.includes('password'));
        expect(passwordError).toBeDefined();
        expect(passwordError?.message).toContain('8');
      }
    });
  });
});
