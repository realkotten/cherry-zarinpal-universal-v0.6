/**
 * Mobile Haptic Feedback Utilities using standard Web Vibration API (navigator.vibrate).
 * Disabled per user request (all vibrations and haptics completely removed).
 */

export type HapticFeedbackType = 
  | 'light' 
  | 'selection' 
  | 'medium' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'toggle';

/**
 * Haptic feedback has been completely removed across the application.
 */
export function triggerHaptic(_type: HapticFeedbackType = 'light'): boolean {
  return false;
}

/** Convenience helper for quick light tap (no-op) */
export const hapticLight = () => false;

/** Convenience helper for item selection (no-op) */
export const hapticSelection = () => false;

/** Convenience helper for step progression (no-op) */
export const hapticStepAdvance = () => false;

/** Convenience helper for appointment creation confirmation (no-op) */
export const hapticSuccess = () => false;

/** Convenience helper for validation or conflict alerts (no-op) */
export const hapticWarning = () => false;

/** Convenience helper for error feedback (no-op) */
export const hapticError = () => false;

