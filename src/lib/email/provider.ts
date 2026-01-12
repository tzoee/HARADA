/**
 * Email Provider Interface
 * Abstraction for sending emails, allowing easy swapping of email services
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ success: boolean; error?: string }>;
}

/**
 * Create an email provider based on environment configuration
 */
export function createEmailProvider(): EmailProvider {
  // In production, you would check for configured providers like:
  // - SendGrid
  // - AWS SES
  // - Resend
  // - Postmark
  
  // For now, return the stub provider
  return new StubEmailProvider();
}

/**
 * Stub Email Provider
 * Logs emails to console instead of sending them
 * Use for development and testing
 */
export class StubEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<{ success: boolean; error?: string }> {
    console.log('=== STUB EMAIL PROVIDER ===');
    console.log('To:', message.to);
    console.log('Subject:', message.subject);
    console.log('HTML:', message.html.substring(0, 200) + '...');
    console.log('===========================');
    
    return { success: true };
  }
}
