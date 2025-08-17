# Community Management Features

This document describes the new community management features that have been implemented in the Reddit clone application.

## Features Overview

### 1. Role-Based Permission System

The application now supports a hierarchical role system for community management:

- **Owner**: Community creator with full permissions
- **Admin**: Can manage roles, ban users, delete posts, pin posts
- **Moderator**: Can ban users, delete posts, pin posts
- **Member**: Regular community member with basic permissions

### 2. Community Management Interface

#### Community Management Component (`CommunityManagement.tsx`)
- **Description Management**: Edit community description
- **Rules Management**: Add, edit, and delete community rules
- **Member Management**: View and manage member roles
- **Banned Users**: Ban and unban users from the community

#### Community Rules Component (`CommunityRules.tsx`)
- Displays community rules in the sidebar
- Rules are sorted by order and numbered
- Only shows if rules exist

### 3. Post Moderation

#### Post Moderation Component (`PostModeration.tsx`)
- **Delete Posts**: Moderators can delete posts
- **Pin/Unpin Posts**: Moderators can pin important posts
- **Ban Users**: Moderators can ban users directly from posts
- Only visible to users with appropriate permissions

### 4. Permission System

#### Permission Hook (`useCommunityPermissions.ts`)
Provides utility functions to check user permissions:
- `getUserRole(communityId)`: Get user's role in a community
- `canModerate(communityId)`: Check if user can moderate
- `canManageRoles(communityId)`: Check if user can manage roles
- `canBanUsers(communityId)`: Check if user can ban users
- `canDeletePosts(communityId)`: Check if user can delete posts
- `canPinPosts(communityId)`: Check if user can pin posts
- `isBanned(communityId)`: Check if user is banned

## Database Schema Updates

### Community Document
```typescript
interface Community {
  // ... existing fields
  description?: string;
  rules?: CommunityRule[];
  members?: CommunityMember[];
  bannedUsers?: BannedUser[];
  pinnedPosts?: string[];
}
```

### New Types
```typescript
type CommunityRole = "owner" | "admin" | "moderator" | "member";

interface CommunityMember {
  userId: string;
  role: CommunityRole;
  joinedAt: Timestamp;
  displayName?: string;
  imageURL?: string;
}

interface CommunityRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface BannedUser {
  userId: string;
  bannedAt: Timestamp;
  bannedBy: string;
  reason: string;
  displayName?: string;
  imageURL?: string;
}
```

## Usage

### For Community Owners/Admins

1. **Access Management Panel**: The management panel appears in the sidebar for users with admin permissions
2. **Manage Rules**: Add, edit, or delete community rules
3. **Manage Members**: View all members and change their roles
4. **Ban Users**: Ban users who violate community guidelines
5. **Pin Posts**: Pin important posts to the top of the community

### For Moderators

1. **Moderate Posts**: Use the moderation actions on posts to delete, pin, or ban users
2. **Ban Users**: Ban users who violate community rules
3. **Delete Posts**: Remove inappropriate content

### For Members

1. **View Rules**: Community rules are displayed in the sidebar
2. **Report Issues**: Contact moderators for issues (to be implemented)

## Implementation Details

### Automatic Role Assignment
- When users join a community, they are automatically assigned the "member" role
- Community creators are automatically assigned the "owner" role
- Roles are stored in both the user's community snippets and the community's members array

### Permission Checking
- Permissions are checked client-side using the `useCommunityPermissions` hook
- Server-side validation should be implemented for security (recommended)

### UI Components
- All management components are conditionally rendered based on user permissions
- Modals are used for complex operations like banning users or editing rules
- Toast notifications provide feedback for user actions

## Security Considerations

1. **Client-Side Only**: Current implementation only checks permissions on the client side
2. **Server-Side Validation**: Implement server-side validation for all moderation actions
3. **Firestore Rules**: Update Firestore security rules to enforce permissions
4. **Rate Limiting**: Implement rate limiting for moderation actions

## Future Enhancements

1. **Audit Log**: Track all moderation actions
2. **Appeal System**: Allow banned users to appeal their ban
3. **Temporary Bans**: Support for temporary bans with expiration dates
4. **Moderator Applications**: Allow users to apply for moderator positions
5. **Automated Moderation**: Implement AI-powered content filtering
6. **Moderation Queue**: Queue system for reviewing reported content

## Testing

Use the `TestManagement` component to verify that permissions are working correctly. This component displays the current user's role and permissions for debugging purposes.
