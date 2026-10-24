export const COMPLAINT_CATEGORIES = ["SEAT", "AC", "CLEAN", "WATER", "INTERNET", "NOISE", "BOOKS", "FEES", "OTHER"] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

/** Open + in-progress complaints a student may have at once, to stop accidental repeats. */
export const MAX_OPEN_COMPLAINTS = 3;

/** Maps complaint status to the shared <Badge> colours. */
export const COMPLAINT_BADGE: Record<string, string> = { OPEN: "PENDING", IN_PROGRESS: "UPCOMING", RESOLVED: "CONFIRMED" };
