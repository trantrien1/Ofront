import { atom } from "recoil";
type Timestamp = any;

export type Post = {
  id: string;
  communityId: string;
  // Original group id from backend, used to strictly filter by community where needed
  originGroupId?: string;
  communityImageURL?: string;
  userDisplayText: string; // change to authorDisplayText
  creatorId: string;
  title: string;
  body: string;
  numberOfComments: number;
  voteStatus: number;
  // 0 = pending approval, 1 = approved
  status?: number;
  // convenience flag derived from status when present
  approved?: boolean;
  // Reaction level (1..4) if set by current user
  likeLevel?: number;
  currentUserVoteStatus?: {
    id: string;
    voteValue: number;
  };
  imageURL?: string;
  postIdx?: number;
  visibility?: "public" | "community";
  createdAt?: Timestamp;
  editedAt?: Timestamp;
  // Whether the post was created anonymously
  anonymous?: boolean;
};

export type PostVote = {
  id?: string;
  postId: string;
  communityId: string;
  voteValue: number;
};

interface PostState {
  selectedPost: Post | null;
  posts: Post[];
  postVotes: PostVote[];
  postsCache: {
    [key: string]: Post[];
  };
  postUpdateRequired: boolean;
}

export const defaultPostState: PostState = {
  selectedPost: null,
  posts: [],
  postVotes: [],
  postsCache: {},
  postUpdateRequired: true,
};

export const postState = atom({
  key: `atoms/posts/postState_${Date.now()}_${Math.random()}`,
  default: defaultPostState,
});
