/**
 * Error Tracking & Analytics Utility
 * Centralizes error handling, classification, and reporting
 *
 * TODO: Replace console logging with actual Sentry integration:
 * import * as Sentry from '@sentry/react';
 */

// Error types for classification
export const ErrorTypes = {
  NETWORK: 'network',
  API: 'api',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown',
};

// Error sources for tracking
export const ErrorSources = {
  HUBSPOT: 'HubSpot',
  LEMLIST: 'Lemlist',
  LEMCAL: 'Lemcal',
  SUPABASE: 'Database',
  UNKNOWN: 'Unknown',
};

/**
 * Classify an error based on its properties
 */
export function classifyError(error) {
  const message = error?.message?.toLowerCase() || '';
  const status = error?.status || error?.response?.status;

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return {
      type: ErrorTypes.NETWORK,
      userMessage: 'Unable to connect. Please check your internet connection.',
      retryable: true,
    };
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return {
      type: ErrorTypes.TIMEOUT,
      userMessage: 'Request timed out. The server may be busy.',
      retryable: true,
    };
  }

  // Permission errors (401, 403)
  if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('forbidden')) {
    return {
      type: ErrorTypes.PERMISSION,
      userMessage: 'Access denied. Please check your API credentials.',
      retryable: false,
    };
  }

  // Validation errors (400)
  if (status === 400 || message.includes('validation') || message.includes('invalid')) {
    return {
      type: ErrorTypes.VALIDATION,
      userMessage: 'Invalid request. Please check your data and try again.',
      retryable: false,
    };
  }

  // API errors (500+)
  if (status >= 500) {
    return {
      type: ErrorTypes.API,
      userMessage: 'Server error. Our team has been notified.',
      retryable: true,
    };
  }

  // Unknown errors
  return {
    type: ErrorTypes.UNKNOWN,
    userMessage: 'Something went wrong. Please try again.',
    retryable: true,
  };
}

/**
 * Identify the error source based on URL or error context
 */
export function identifyErrorSource(error, context = {}) {
  const url = error?.config?.url || context?.url || '';

  if (url.includes('hubspot') || context?.source === 'hubspot') {
    return ErrorSources.HUBSPOT;
  }
  if (url.includes('lemlist') || context?.source === 'lemlist') {
    return ErrorSources.LEMLIST;
  }
  if (url.includes('lemcal') || context?.source === 'lemcal') {
    return ErrorSources.LEMCAL;
  }
  if (url.includes('supabase') || context?.source === 'supabase') {
    return ErrorSources.SUPABASE;
  }

  return ErrorSources.UNKNOWN;
}

/**
 * Create a user-friendly error message
 */
export function createUserErrorMessage(error, context = {}) {
  const classification = classifyError(error);
  const source = identifyErrorSource(error, context);

  if (source !== ErrorSources.UNKNOWN) {
    return `${source} API: ${classification.userMessage}`;
  }

  return classification.userMessage;
}

/**
 * Log error to tracking service (Sentry placeholder)
 */
export function trackError(error, context = {}) {
  const classification = classifyError(error);
  const source = identifyErrorSource(error, context);

  const errorData = {
    type: classification.type,
    source,
    message: error?.message,
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Tracking]', errorData);
  }

  // TODO: Send to Sentry in production
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, {
  //     tags: { type: classification.type, source },
  //     extra: context,
  //   });
  // }

  return errorData;
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff(
  fn,
  {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry = () => {},
  } = {}
) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const classification = classifyError(error);

      // Don't retry non-retryable errors
      if (!classification.retryable || attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelay
      );

      onRetry({ attempt, maxAttempts, delay, error });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Create enhanced error with user message
 */
export function enhanceError(error, context = {}) {
  const classification = classifyError(error);
  const source = identifyErrorSource(error, context);

  const enhanced = new Error(classification.userMessage);
  enhanced.originalError = error;
  enhanced.type = classification.type;
  enhanced.source = source;
  enhanced.retryable = classification.retryable;
  enhanced.context = context;

  return enhanced;
}

export default {
  ErrorTypes,
  ErrorSources,
  classifyError,
  identifyErrorSource,
  createUserErrorMessage,
  trackError,
  retryWithBackoff,
  enhanceError,
};
