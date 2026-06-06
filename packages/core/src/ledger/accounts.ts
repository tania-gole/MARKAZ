/**
 * Chart of accounts for the pilot.
 *
 * String codes (not a DB enum or Account table). Adding an account is a code
 * change, not a migration — matches the status-string pattern used elsewhere.
 *
 * Pilot starts with just the two accounts the commission flow actually needs.
 * Future accounts (buyer_clearing + seller_payable when digital escrow lands;
 * partner_referral_payable when partner deals land; commission_collected when
 * we start tracking received cash) are added when the feature that posts to
 * them is built. Zero migration cost.
 */
export const ACCOUNT_CODES = [
  'commission_receivable', // asset: 1% commission earned, not yet collected
  'commission_revenue', //    revenue: the 1% buyer-paid commission earned
] as const;

export type AccountCode = (typeof ACCOUNT_CODES)[number];

export function isAccountCode(x: string): x is AccountCode {
  return (ACCOUNT_CODES as readonly string[]).includes(x);
}
