// Utility functions for sanitizing user input to prevent XSS attacks

/**
 * Sanitizes a string by escaping HTML characters
 * @param str - The string to sanitize
 * @returns The sanitized string
 */
export const sanitizeHtml = (str: string | null | undefined): string => {
  if (!str) return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitizes a string for safe display in React components
 * @param str - The string to sanitize
 * @returns The sanitized string
 */
export const sanitizeText = (str: string | null | undefined): string => {
  if (!str) return '';
  
  // Remove potentially dangerous characters
  return str.replace(/[<>\"'&]/g, '');
};

/**
 * Validates and sanitizes email addresses
 * @param email - The email to validate and sanitize
 * @returns The sanitized email or empty string if invalid
 */
export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return '';
  }
  
  return sanitizeText(email);
};

/**
 * Sanitizes numeric values
 * @param value - The value to sanitize
 * @returns The sanitized number or 0 if invalid
 */
export const sanitizeNumber = (value: any): number => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

/**
 * Sanitizes and validates URLs
 * @param url - The URL to sanitize
 * @returns The sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '';
    }
    return urlObj.toString();
  } catch {
    return '';
  }
};