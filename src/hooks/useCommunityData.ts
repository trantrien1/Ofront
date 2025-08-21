import { useEffect, useState } from "react";
// Firebase removed
import { useRouter } from "next/router";
import { useRecoilState, useSetRecoilState } from "recoil";
import { authModalState } from "../atoms/authModalAtom";
import {
  Community,
  CommunitySnippet,
  communityState,
  defaultCommunity,
} from "../atoms/communitiesAtom";
// Firebase removed
import { getMySnippets } from "../helpers/firestore";

// Add ssrCommunityData near end as small optimization
const useCommunityData = (ssrCommunityData?: boolean) => {
  const user = null as any;
  const router = useRouter();
  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);
  const setAuthModalState = useSetRecoilState(authModalState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  // Client-side mounting check
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !!communityStateValue.mySnippets.length || !mounted) return;

    getSnippets();
  }, [user, mounted]);

  const getSnippets = async () => {
    setLoading(true);
    try {
      const snippets = await getMySnippets(user?.uid!);
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: snippets as CommunitySnippet[],
        initSnippetsFetched: true,
      }));
      setLoading(false);
    } catch (error: any) {
  console.error("Error getting user snippets", error);
      setError(error.message);
    }
    setLoading(false);
  };

  const getCommunityData = async (communityId: string) => {
    // this causes weird memory leak error - not sure why
    // setLoading(true);
    try {
      // TODO: Fetch from API
      const communityDoc = { id: communityId, data: () => ({}) } as any;
      // setCommunityStateValue((prev) => ({
      //   ...prev,
      //   visitedCommunities: {
      //     ...prev.visitedCommunities,
      //     [communityId as string]: {
      //       id: communityDoc.id,
      //       ...communityDoc.data(),
      //     } as Community,
      //   },
      // }));
      setCommunityStateValue((prev) => ({
        ...prev,
        currentCommunity: {
          id: communityId,
          ...(communityDoc.data?.() || {}),
        } as Community,
      }));
    } catch (error: any) {
      console.error("getCommunityData error", error.message);
    }
    setLoading(false);
  };

  const onJoinLeaveCommunity = (community: Community, isJoined?: boolean) => {
  // Join/leave triggered for community id: (see UI state)

    if (!user) {
      setAuthModalState({ open: true, view: "login" });
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
  // attempt to join community
    try {
      const newSnippet: CommunitySnippet = {
        communityId: community.id,
        imageURL: community.imageURL || "",
        role: "member",
      };

      // Add user to community members
      const newMember = {
        userId: user?.uid || "",
        role: "member" as const,
        joinedAt: new Date() as any,
        displayName: "",
        imageURL: "",
      };

      // TODO: Call API to join community and persist member

      // Add current community to snippet
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: [...prev.mySnippets, newSnippet],
      }));
    } catch (error) {
      console.error("joinCommunity error", error);
    }
    setLoading(false);
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
  };
};

export default useCommunityData;
