import { atom } from "recoil";
import { FieldValue, Timestamp } from "firebase/firestore";

export type CommunityRole = "owner" | "admin" | "moderator" | "member";

export interface CommunityMember {
  userId: string;
  role: CommunityRole;
  joinedAt: Timestamp;
  displayName?: string;
  imageURL?: string;
}

export interface CommunityRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface BannedUser {
  userId: string;
  bannedAt: Timestamp;
  bannedBy: string;
  reason: string;
  displayName?: string;
  imageURL?: string;
}

export interface Community {
  id: string;
  creatorId: string;
  numberOfMembers: number;
  privacyType: "public" | "restricted" | "private";
  createdAt?: Timestamp;
  imageURL?: string;
  displayName?: string;
  // New fields for community management
  description?: string;
  rules?: CommunityRule[];
  members?: CommunityMember[];
  bannedUsers?: BannedUser[];
  pinnedPosts?: string[];
}

export interface CommunitySnippet {
  communityId: string;
  isModerator?: boolean;
  imageURL?: string;
  role?: CommunityRole;
}

interface CommunityState {
  [key: string]:
    | CommunitySnippet[]
    | { [key: string]: Community }
    | Community
    | boolean
    | undefined;
  mySnippets: CommunitySnippet[];
  initSnippetsFetched: boolean;
  visitedCommunities: {
    [key: string]: Community;
  };
  currentCommunity: Community;
}

export const defaultCommunity: Community = {
  id: "",
  creatorId: "",
  numberOfMembers: 0,
  privacyType: "public",
};

export const defaultCommunityState: CommunityState = {
  mySnippets: [],
  initSnippetsFetched: false,
  visitedCommunities: {},
  currentCommunity: defaultCommunity,
};

export const communityState = atom<CommunityState>({
  key: `atoms/communities/communityState_${Date.now()}_${Math.random()}`,
  default: defaultCommunityState,
});
