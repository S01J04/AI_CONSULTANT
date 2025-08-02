import DOMPurify from 'dompurify';

/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * @param content The HTML content to sanitize
 * @returns Sanitized HTML content
 */
export const sanitizeHtml = (content: string): string => {
  return DOMPurify.sanitize(content);
};

/**
 * Validate email format
 * 
 * @param email The email to validate
 * @returns Whether the email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * 
 * @param password The password to validate
 * @returns Whether the password is strong enough
 */
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Get password strength feedback
 * 
 * @param password The password to check
 * @returns Feedback about password strength
 */
export const getPasswordStrengthFeedback = (password: string): string => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/\d/.test(password)) return 'Password must include a number';
  if (!/[@$!%*?&]/.test(password)) return 'Password must include a special character';
  return 'Password is strong';
};

/**
 * Sanitize user input to prevent injection attacks
 * 
 * @param input The user input to sanitize
 * @returns Sanitized input
 */
export const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous characters
  return input
    // .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // .replace(/javascript:/gi, '')
    // .replace(/on\w+=/gi, '')
    // .replace(/style=/gi, '')
    // .trim();
};

/**
 * Validate chat message
 * 
 * @param message The message to validate
 * @param maxLength Maximum allowed length
 * @returns Whether the message is valid
 */
export const isValidChatMessage = (message: string, maxLength: number = 1000): boolean => {
  if (!message || message.trim().length < 2) return false;
  if (message.length > maxLength) return false;
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+=/gi
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) return false;
  }
  
  return true;
};

/**
 * Validate and sanitize chat message
 * 
 * @param message The message to validate and sanitize
 * @param maxLength Maximum allowed length
 * @returns Sanitized message or null if invalid
 */
export const validateAndSanitizeChatMessage = (message: string, maxLength: number = 1000): string | null => {
  if (!isValidChatMessage(message, maxLength)) return null;
  return sanitizeInput(message);
};

/**
 * Encode HTML entities to prevent XSS
 * 
 * @param text The text to encode
 * @returns Encoded text
 */
export const encodeHtml = (text: string): string => {
  const element = document.createElement('div');
  element.innerText = text;
  return element.innerHTML;
};

/**
 * Generate a secure random ID
 * 
 * @param length The length of the ID
 * @returns A secure random ID
 */
export const generateSecureId = (length: number = 16): string => {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
