import { useEffect, useState } from "react";
// Firebase removed
import { useRouter } from "next/router";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { authModalState } from "../atoms/authModalAtom";
import {
  Community,
  CommunitySnippet,
  communityState,
  defaultCommunity,
  CommunityRole,
} from "../atoms/communitiesAtom";
// Firebase removed
// import { getMySnippets } from "../helpers/firestore";
import { getGroupsByUser, getGroupById } from "../services/groups.service";
import { userState } from "../atoms/userAtom";
import { useCommunityPermissions } from "./useCommunityPermissions";
import { joinGroup } from "../services/groups.service";

// Add ssrCommunityData near end as small optimization
const useCommunityData = (ssrCommunityData?: boolean) => {
  const user = useRecoilValue(userState);
  const router = useRouter();
  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);
  const { getUserRole } = useCommunityPermissions();
  const setAuthModalState = useSetRecoilState(authModalState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  // Hàm cập nhật role cho cả members và mySnippets
  const handleUpdateRole = (userId: string, newRole: CommunityRole) => {
    // Cập nhật role trong members
    const updatedMembers = communityStateValue.currentCommunity.members?.map(member =>
      member.userId === userId ? { ...member, role: newRole } : member
    ) || [];

    // Đồng bộ cập nhật role trong mySnippets nếu userId là user hiện tại
    const updatedSnippets = communityStateValue.mySnippets.map(snippet => {
      if (
        snippet.communityId === communityStateValue.currentCommunity.id &&
        user?.uid === userId
      ) {
        return { ...snippet, role: newRole };
      }
      return snippet;
    });

    setCommunityStateValue(prev => ({
      ...prev,
      currentCommunity: { ...prev.currentCommunity, members: updatedMembers },
      mySnippets: updatedSnippets
    }));
  };

  // Client-side mounting check
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Fetch membership snapshot once after mount. Do NOT depend on user state
    // because it may hydrate later and we can still call the API using cookies.
    if (communityStateValue.initSnippetsFetched || !mounted) return;
    getSnippets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, communityStateValue.initSnippetsFetched]);

  const getSnippets = async () => {
    setLoading(true);
    try {
      // Use real API to get all groups the current user belongs to
      const groups = await getGroupsByUser().catch(() => [] as any[]);
      const uid = user?.uid?.toString?.() || "";
      const snippets: CommunitySnippet[] = (Array.isArray(groups) ? groups : []).map((g: any) => {
        const communityId = String(g.id ?? g.groupId ?? g.code ?? "");
        const imageURL = g.imageURL || g.imageUrl || g.avatar || "";
        // Prefer backend userRole when provided
        let role: any = (g.userRole || g.role || "").toString().toLowerCase();
        if (!role) {
          // Fallback: if creator/owner inferred locally, treat as admin per requirement
          const owner = String(g.ownerId ?? g.userId ?? "");
          if (owner && uid && owner === uid) role = "admin";
          else role = "member";
        } else if (role === 'owner') {
          // Normalize owner to admin for permissions in UI
          role = 'admin';
        }
        return { communityId, imageURL, role } as CommunitySnippet;
      }).filter((s) => !!s.communityId);

      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: snippets,
        initSnippetsFetched: true,
      }));
    } catch (error: any) {
      console.error("Error getting membership snapshot", error);
      setCommunityStateValue((prev) => ({
        ...prev,
        initSnippetsFetched: true,
      }));
      setError(error?.message || String(error));
    }
    setLoading(false);
  };

  const getCommunityData = async (communityId: string) => {
    setLoading(true);
    try {
      // Fetch real group details (includes numberOfMembers, imageURL, ownerId, etc.)
      const g = await getGroupById(communityId);
      if (g) {
        setCommunityStateValue((prev) => ({
          ...prev,
          currentCommunity: {
            ...(prev.currentCommunity || {}),
            id: String(g.id),
            creatorId: String(g.ownerId ?? (prev.currentCommunity as any)?.creatorId ?? ""),
            numberOfMembers: Number(g.numberOfMembers ?? (prev.currentCommunity as any)?.numberOfMembers ?? 0) || 0,
            privacyType: ((g.privacyType as any) || (prev.currentCommunity as any)?.privacyType || "public") as any,
            imageURL: g.imageURL ?? (prev.currentCommunity as any)?.imageURL,
            displayName: g.name || (prev.currentCommunity as any)?.displayName || String(g.id),
          } as Community,
        }));
      } else {
        // Fallback to minimal object with given id
        setCommunityStateValue((prev) => ({
          ...prev,
          currentCommunity: {
            ...(prev.currentCommunity || {}),
            id: communityId,
          } as Community,
        }));
      }
    } catch (error: any) {
      console.error("getCommunityData error", error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const onJoinLeaveCommunity = (community: Community, isJoined?: boolean) => {
    // If not logged in, prompt login
    if (!user) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    // If user already has a privileged role (owner/admin), treat as joined and do nothing
    const role = getUserRole(community.id);
    const hasPrivilegedRole = role === "owner" || role === "admin";
    if (hasPrivilegedRole && !isJoined) {
      // Ensure a snippet exists so UI reflects joined state
      const exists = communityStateValue.mySnippets.some(s => s.communityId === community.id);
      if (!exists) {
        const newSnippet: CommunitySnippet = {
          communityId: community.id,
          imageURL: community.imageURL || "",
          role: role,
        };
        setCommunityStateValue((prev) => ({
          ...prev,
          mySnippets: [...prev.mySnippets, newSnippet],
        }));
      }
      return;
    }

    setLoading(true);
    if (isJoined) {
      leaveCommunity(community.id);
      return;
    }
    joinCommunity(community);
  };

  const joinCommunity = async (community: Community) => {
  try {
    // Optimistic add to snippets and members so UI updates immediately
    const optimisticSnippet: CommunitySnippet = {
      communityId: community.id,
      imageURL: community.imageURL || "",
      role: "member",
    };
    const optimisticMember = {
      userId: user?.uid || "",
      role: "member" as const,
      joinedAt: new Date() as any,
      displayName: user?.displayName || "",
      imageURL: user?.photoURL || "",
    };

    setCommunityStateValue((prev) => {
      const exists = prev.mySnippets.some((s) => s.communityId === community.id);
      return {
        ...prev,
        mySnippets: exists ? prev.mySnippets : [...prev.mySnippets, optimisticSnippet],
        currentCommunity: {
          ...prev.currentCommunity,
          members: [...(prev.currentCommunity.members || []), optimisticMember],
          numberOfMembers: (prev.currentCommunity.numberOfMembers || 0) + 1,
        },
      };
    });

    // Call backend; if it fails, rollback
    await joinGroup(community.id);
  } catch (error) {
    console.error("joinCommunity error", error);
    // Rollback optimistic updates
    setCommunityStateValue((prev) => ({
      ...prev,
      mySnippets: prev.mySnippets.filter((s) => s.communityId !== community.id),
      currentCommunity: {
        ...prev.currentCommunity,
        members: (prev.currentCommunity.members || []).filter((m) => m.userId !== (user?.uid || "")),
        numberOfMembers: Math.max(0, (prev.currentCommunity.numberOfMembers || 0) - 1),
      },
    }));
  } finally {
    setLoading(false);
  }
  };

  const leaveCommunity = async (communityId: string) => {
    try {
      // Remove user from community members
      const currentCommunity = communityStateValue.currentCommunity;
      const updatedMembers = currentCommunity.members?.filter(
        member => member.userId !== (user?.uid || "")
      ) || [];
      // TODO: Call API to leave community and persist update

      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: prev.mySnippets.filter(
          (item) => item.communityId !== communityId
        ),
      }));
    } catch (error) {
      console.error("leaveCommunity error", error);
    }
    setLoading(false);
  };

  // useEffect(() => {
  //   if (ssrCommunityData) return;
  //   const { community } = router.query;
  //   if (community) {
  //     const communityData =
  //       communityStateValue.visitedCommunities[community as string];
  //     if (!communityData) {
  //       getCommunityData(community as string);
  //       return;
  //     }
  //   }
  // }, [router.query]);

  useEffect(() => {
    // if (ssrCommunityData) return;
    const { community } = router.query;
    if (community) {
      const communityData = communityStateValue.currentCommunity;

      if (!communityData.id) {
        getCommunityData(community as string);
        return;
      }
      // console.log("this is happening", communityStateValue);
    } else {
      /**
       * JUST ADDED THIS APRIL 24
       * FOR NEW LOGIC OF NOT USING visitedCommunities
       */
      setCommunityStateValue((prev) => ({
        ...prev,
        currentCommunity: defaultCommunity,
      }));
    }
  }, [router.query]); // Remove communityStateValue.currentCommunity dependency to prevent infinite loop

  // console.log("LOL", communityStateValue);

  return {
    communityStateValue,
    onJoinLeaveCommunity,
    loading,
    setLoading,
    error,
    mounted,
    handleUpdateRole,
  };
};

export default useCommunityData;
