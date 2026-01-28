// Usage limits
export const DAILY_LIMIT = 50;
export const WARNING_THRESHOLD = 45;

// Trial configuration
export const TRIAL_DURATION_DAYS = 7;

// Pricing (display only - actual prices come from Stripe)
export const PRICING = {
  monthly: {
    amount: 29,
    display: '€29',
    interval: 'mėn.',
  },
  yearly: {
    amount: 299,
    display: '€299',
    interval: 'm.',
    savings: '14%',
  },
} as const;

// Helper to format today's date as YYYY-MM-DD in UTC
export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}
