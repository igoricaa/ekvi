/**
 * Authentication error messages
 * Centralized for easy translation to Serbian in the future
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password",
  RATE_LIMITED: "Too many attempts. Please try again later",
  SERVER_ERROR: "Server error. Please try again",
  EMAIL_NOT_VERIFIED: "Please verify your email address",
  GENERIC: "Authentication failed. Please try again",
} as const;

// type AuthErrorType = keyof typeof AUTH_ERRORS;

type AuthErrorResult = {
  message: string;
  showFieldErrors: boolean;
  fieldMessage?: string;
};

/**
 * Maps better-auth error status and message to localized error messages
 * @param status - HTTP status code from auth error
 * @param serverMessage - Optional server error message
 * @returns Error message and whether to show field-level errors
 */
export function getAuthErrorMessage(
  status: number,
  serverMessage?: string
): AuthErrorResult {
  // Authentication failures - show on form fields
  if (status === 401 || status === 403) {
    // Check if it's an email verification issue
    if (
      serverMessage?.toLowerCase().includes("verify") ||
      serverMessage?.toLowerCase().includes("verification")
    ) {
      return {
        message: AUTH_ERRORS.EMAIL_NOT_VERIFIED,
        showFieldErrors: false, // Don't highlight fields for verification issues
      };
    }

    return {
      message: AUTH_ERRORS.INVALID_CREDENTIALS,
      showFieldErrors: true,
      fieldMessage: AUTH_ERRORS.INVALID_CREDENTIALS,
    };
  }

  // Rate limiting - don't show on fields
  if (status === 429) {
    return {
      message: AUTH_ERRORS.RATE_LIMITED,
      showFieldErrors: false,
    };
  }

  // Server errors - don't show on fields
  if (status >= 500) {
    return {
      message: AUTH_ERRORS.SERVER_ERROR,
      showFieldErrors: false,
    };
  }

  // Default fallback
  return {
    message: serverMessage || AUTH_ERRORS.GENERIC,
    showFieldErrors: false,
  };
}
