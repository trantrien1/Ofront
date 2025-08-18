type Timestamp = any;

// Users
export type AppUserRole = "user" | "admin";

export interface UserProfile {
	uid: string;
	username: string;
	email: string;
	role: AppUserRole;
	avatarURL?: string;
	createdAt?: Timestamp;
	status?: number;
}

// Categories
export interface CategoryDoc {
	id: string;
	name: string;
	description?: string;
	createdAt?: Timestamp;
}

// Posts
export type PostType = "blog" | "forum";

export interface ForumPostDoc {
	id: string;
	userId: string;
	categoryId?: string | null;
	title: string;
	content: string;
	type: PostType;
	createdAt?: Timestamp;
	updatedAt?: Timestamp;
	status?: number;
	// Optional fields for interoperability with existing UI
	communityId?: string;
	imageURL?: string;
}

// Comments
export interface CommentDoc {
	id: string;
	postId: string;
	userId: string;
	content: string;
	parentId?: string | null;
	createdAt?: Timestamp;
}

// Likes
export interface LikeDoc {
	id: string;
	userId: string;
	postId?: string | null;
	commentId?: string | null;
	createdAt?: Timestamp;
}

// Tags
export interface TagDoc {
	id: string;
	name: string;
}

export interface PostTagDoc {
	id: string; // `${postId}_${tagId}`
	postId: string;
	tagId: string;
}

// Groups
export interface GroupDoc {
	id: string;
	name: string;
	description?: string;
	isPrivate: boolean;
	createdAt?: Timestamp;
}

export type GroupRole = "member" | "moderator" | "admin";

export interface GroupMemberDoc {
	id: string; // userId
	groupId: string;
	userId: string;
	role: GroupRole;
	joinedAt?: Timestamp;
	status?: number;
}

// Notifications (simple)
export interface SimpleNotificationDoc {
	id: string;
	userId: string; // target user
	content: string;
	isRead: boolean;
	createdAt?: Timestamp;
}

// Messages
export interface MessageDoc {
	id: string;
	senderId: string;
	receiverId: string;
	content: string;
	createdAt?: Timestamp;
}


