import { MICROCOPY } from '@/lib/site';

// Two chat labels that need their own MICROCOPY entries (plan 6.2 says the launcher reads "Ask";
// the send button's name should be "Send"). They are not in lib/site.ts yet because Andrew signs
// MICROCOPY off. Until they land, both fall back to MICROCOPY.ask; once `send` and `askShort` are
// added to MICROCOPY they are used here with no other edit.
//
// The widened type is what lets this compile today: MICROCOPY does not have the keys yet, and an
// object without an optional key is still assignable to a type that has it.
const pending: typeof MICROCOPY & { send?: string; askShort?: string } = MICROCOPY;

export const COPY = {
  send: pending.send ?? MICROCOPY.ask,
  askShort: pending.askShort ?? MICROCOPY.ask,
} as const;
