import { membershipStatus, type MembershipStatus } from "./membership";

export function statusOf(m: { startDate: Date; endDate: Date } | null | undefined, today: Date): MembershipStatus | "NONE" {
  return m ? membershipStatus(m, today) : "NONE";
}
