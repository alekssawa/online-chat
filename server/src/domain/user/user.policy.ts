import type { PrivacyLevel } from "../../graphql/types.js";

export interface PrivacyContext {
  isSelf: boolean;
  isFriend: boolean;
}

export function canView(level: PrivacyLevel, ctx: PrivacyContext): boolean {
  if (ctx.isSelf) return true;
  if (level === "ALL") return true;
  if (level === "FRIENDS" && ctx.isFriend) return true;
  return false;
}

export function buildPrivacyContext(
  viewerId: string | undefined,
  targetUserId: string,
  friendIds: Set<string>,
): PrivacyContext {
  return {
    isSelf: viewerId === targetUserId,
    isFriend: viewerId ? friendIds.has(targetUserId) : false,
  };
}
