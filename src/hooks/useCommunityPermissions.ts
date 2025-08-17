import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilValue } from "recoil";
import { auth } from "../firebase/clientApp";
import { communityState, CommunityRole } from "../atoms/communitiesAtom";

export const useCommunityPermissions = () => {
  const [user] = useAuthState(auth);
  const communityStateValue = useRecoilValue(communityState);

  const getUserRole = (communityId: string): CommunityRole => {
    if (!user) return "member";
    
    const community = communityStateValue.currentCommunity;
    if (community.id === communityId) {
      // Check if user is the owner
      if (user.uid === community.creatorId) return "owner";
      
      // Check members array
      const member = community.members?.find(m => m.userId === user.uid);
      return member?.role || "member";
    }
    
    // Check snippets for other communities
    const snippet = communityStateValue.mySnippets.find(
      (snippet: any) => snippet.communityId === communityId
    );
    return snippet?.role || "member";
  };

  const canModerate = (communityId: string): boolean => {
    const role = getUserRole(communityId);
    return role === "owner" || role === "admin" || role === "moderator";
  };

  const canManageRoles = (communityId: string): boolean => {
    const role = getUserRole(communityId);
    return role === "owner" || role === "admin";
  };

  const canBanUsers = (communityId: string): boolean => {
    const role = getUserRole(communityId);
    return role === "owner" || role === "admin" || role === "moderator";
  };

  const canDeletePosts = (communityId: string): boolean => {
    const role = getUserRole(communityId);
    return role === "owner" || role === "admin" || role === "moderator";
  };

  const canPinPosts = (communityId: string): boolean => {
    const role = getUserRole(communityId);
    return role === "owner" || role === "admin" || role === "moderator";
  };

  const isBanned = (communityId: string): boolean => {
    if (!user) return false;
    
    const community = communityStateValue.currentCommunity;
    if (community.id === communityId) {
      return community.bannedUsers?.some(banned => banned.userId === user.uid) || false;
    }
    return false;
  };

  return {
    getUserRole,
    canModerate,
    canManageRoles,
    canBanUsers,
    canDeletePosts,
    canPinPosts,
    isBanned,
  };
};
