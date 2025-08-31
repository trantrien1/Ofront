import { useRecoilValue } from "recoil";
import { communityState, CommunityRole } from "../atoms/communitiesAtom";
import { userState } from "../atoms/userAtom";

export const useCommunityPermissions = () => {
  const user = useRecoilValue(userState);
  const communityStateValue = useRecoilValue(communityState);

  const getUserRole = (communityId: string): CommunityRole => {
    if (!user) return "member";
    const cid = String(communityId);
    const community = communityStateValue.currentCommunity;
    if (community && String(community.id) === cid) {
      // Treat creator as admin for role reads (UI/gating), per requirement
      if (String(user.uid) === String(community.creatorId)) return "admin";

      // Ưu tiên lấy role từ members array (đã được optimistic update)
      const member = community.members?.find(m => String(m.userId) === String(user.uid));
      if (member?.role) return member.role;

      // Fallback to snippet role nếu không có members
      const snippetHere = communityStateValue.mySnippets.find(
        (snippet: any) => String(snippet.communityId) === cid
      );
      if (snippetHere?.role) return snippetHere.role as CommunityRole;
      // Check visitedCommunities cache nếu có
      const visited = (communityStateValue.visitedCommunities || {}) as any;
      const v = visited[cid];
      if (v) {
        if (String(user.uid) === String(v.creatorId)) return "owner";
        const vm = Array.isArray(v.members) ? v.members.find((m: any) => String(m.userId) === String(user.uid)) : null;
        if (vm?.role) return vm.role as CommunityRole;
      }
      return "member";
    }
    // Check snippets cho các community khác
    const snippet = communityStateValue.mySnippets.find(
      (snippet: any) => String(snippet.communityId) === cid
    );
    return (snippet?.role as CommunityRole) || "member";
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
    const cid = String(communityId);
    const community = communityStateValue.currentCommunity;
    if (String(community.id) === cid) {
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
