import { db } from '@markaz/db';
import type { Machine, PersistenceAdapter } from './types';
import { allOwnersSigned } from './guards';

export const LISTING_STATES = [
  'Draft',
  'PendingDocuments',
  'PendingOwnershipReview',
  'PendingSignature',
  'PendingPermit',
  'Live',
  'Withdrawn',
  'Rejected',
] as const;

export type ListingState = (typeof LISTING_STATES)[number];

export const LISTING_ACTIONS = [
  'completeDetails',
  'uploadDeed',
  'verifyOwnership',
  'rejectOwnership',
  'completeSignatures',
  'recordPermit',
  'denyPermit',
  'withdraw',
] as const;

export type ListingAction = (typeof LISTING_ACTIONS)[number];

/**
 * Listing machine. Mirrors docs/diagrams/05-listing-state-machine.md.
 *
 * Creation event (Week 3 note): the engine only handles state-to-state
 * transitions because it needs a from-state to CAS on. The first row's
 * creation event (fromState: null, toState: 'Draft') is the feature's
 * responsibility: when the listing creation flow inserts the Listing row,
 * it MUST also insert an Event row in the same transaction. The engine does
 * not synthesise this bootstrap event; if the feature forgets, the audit
 * trail starts at the second event.
 */
export const listingMachine: Machine<ListingState, ListingAction> = {
  aggregateType: 'listing',
  initialState: 'Draft',
  terminalStates: ['Live', 'Withdrawn', 'Rejected'],
  transitions: [
    // Forward path
    { from: 'Draft', to: 'PendingDocuments', action: 'completeDetails' },
    { from: 'PendingDocuments', to: 'PendingOwnershipReview', action: 'uploadDeed' },
    { from: 'PendingOwnershipReview', to: 'PendingSignature', action: 'verifyOwnership' },
    { from: 'PendingOwnershipReview', to: 'Rejected', action: 'rejectOwnership' },
    {
      from: 'PendingSignature',
      to: 'PendingPermit',
      action: 'completeSignatures',
      guard: allOwnersSigned,
    },
    { from: 'PendingPermit', to: 'Live', action: 'recordPermit' },
    { from: 'PendingPermit', to: 'Rejected', action: 'denyPermit' },
    // Withdraw is allowed from every pre-live state. Listed exhaustively (no
    // wildcard) so the config remains pure data and validateMachine catches
    // any future state that someone forgot to wire withdrawal for.
    { from: 'Draft', to: 'Withdrawn', action: 'withdraw' },
    { from: 'PendingDocuments', to: 'Withdrawn', action: 'withdraw' },
    { from: 'PendingOwnershipReview', to: 'Withdrawn', action: 'withdraw' },
    { from: 'PendingSignature', to: 'Withdrawn', action: 'withdraw' },
    { from: 'PendingPermit', to: 'Withdrawn', action: 'withdraw' },
  ],
};

/**
 * Concrete persistence adapter for Listing. The engine never imports this;
 * it's plumbed in via the registry.
 */
export const listingAdapter: PersistenceAdapter<ListingState> = {
  async readState(id) {
    const row = await db.listing.findUnique({
      where: { id },
      select: { status: true },
    });
    return row ? (row.status as ListingState) : null;
  },
  async casUpdateState(tx, id, from, to) {
    const result = await tx.listing.updateMany({
      where: { id, status: from },
      data: { status: to },
    });
    return result.count === 1;
  },
};
