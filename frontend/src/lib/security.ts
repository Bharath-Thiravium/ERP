/**
 * Security utilities for frontend
 */

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate and sanitize log messages
 */
export function sanitizeLogMessage(message: string): string {
  if (!message) return '';
  
  // Remove newlines and control characters that could be used for log injection
  return message.replace(/[\r\n\t\x00-\x1f\x7f-\x9f]/g, '');
}

/**
 * Generate secure random string
 */
export function generateSecureId(): string {
  return crypto.randomUUID();
}

/**
 * Validate file type for uploads
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}