/**
 * Formats an ISO timestamp string into a readable date and time representation.
 * 
 * @param {string | null | undefined} dateString - The ISO timestamp string.
 * @returns {string} The fully formatted human-readable date and time.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  
  // Format to something clean like: Oct 12, 2026 at 7:00 PM
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats price values as formatted Kenyan Shilling (Ksh) strings.
 * 
 * @param {number} amount - The currency value.
 * @returns {string} Formatted price (e.g. "Ksh 120.00" or "Free").
 */
export function formatPrice(amount: number): string {
  if (amount === 0) return 'Free';
  const formattedAmount = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  return `Ksh ${formattedAmount}`;
}
