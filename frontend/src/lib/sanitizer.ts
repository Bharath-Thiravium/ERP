/**
 * HTML sanitization utilities to prevent XSS attacks
 */

export function sanitizeHtml(input: string): string {
  if (!input) return input;
  
  // Create a temporary div element to leverage browser's HTML parsing
  const temp = document.createElement('div');
  temp.textContent = input;
  return temp.innerHTML;
}

export function escapeHtml(text: string): string {
  if (!text) return text;
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (s) => map[s]);
}

export function sanitizeUserInput(input: string): string {
  if (!input) return input;
  
  // Remove script tags and javascript: protocols
  let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  return escapeHtml(sanitized);
}

export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}