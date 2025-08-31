import { atom, type RecoilState } from "recoil";
type Timestamp = any;

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

declare global {
  // eslint-disable-next-line no-var
  var __recoil_communityState: RecoilState<CommunityState> | undefined;
  // eslint-disable-next-line no-var
  var __recoil_createCommunityModalState: RecoilState<CreateCommunityModalState> | undefined;
}

export const communityState: RecoilState<CommunityState> = (globalThis as any)
  .__recoil_communityState ??=
  atom<CommunityState>({
    key: "atoms/communities/communityState",
    default: defaultCommunityState,
  });

// Add create community modal state
export interface CreateCommunityModalState {
  open: boolean;
}

const defaultCreateCommunityModalState: CreateCommunityModalState = {
  open: false,
};

export const createCommunityModalState: RecoilState<CreateCommunityModalState> = (globalThis as any)
  .__recoil_createCommunityModalState ??=
  atom<CreateCommunityModalState>({
    key: "atoms/communities/createCommunityModalState",
    default: defaultCreateCommunityModalState,
  });
