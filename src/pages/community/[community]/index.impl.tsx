import { useEffect, useMemo, useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useRecoilState } from "recoil";
import { Community, communityState } from "../../../atoms/communitiesAtom";
import CommunityNotFound from "../../../components/Community/CommunityNotFound";
import CommunityInfo from "../../../components/Community/CommunityInfo";
import Header from "../../../components/Community/Header";
import CommunityRules from "../../../components/Community/CommunityRules";
import CommunityHighlights from "../../../components/Community/CommunityHighlights";
import PageContentLayout from "../../../components/Layout/PageContent";
import Posts from "../../../components/Post/Posts";
import { Box, HStack, Spinner, Center, useToast } from "@chakra-ui/react";

const CommunityPage: NextPage = () => {
  const router = useRouter();
  const communityId = useMemo(() => {
    const raw = router.query?.community;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [router.query]);
  const user = null as any;
  const loadingUser = false;

  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);

  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = String(communityId || "");
    if (!id) return;
    let ignore = false;
    const fetchCommunity = async () => {
      setLoading(true); setError(null);
      try {
        const r = await fetch(`/api/group/get/${encodeURIComponent(id)}`);
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        const j = await r.json();
        const obj = j?.data ?? j;
        const comm = toCommunity(obj);
        if (!ignore) {
          setCommunityStateValue((prev) => ({ ...prev, currentCommunity: comm as any }));
        }
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Failed to load community");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchCommunity();
    return () => { ignore = true; };
  }, [communityId, setCommunityStateValue]);

  const communityData = communityStateValue.currentCommunity as Community | undefined;
  if (!communityId) {
    return (
      <Center py={20}><Spinner /></Center>
    );
  }
  if (loading && !communityData) {
    return (
      <Center py={20}><Spinner /></Center>
    );
  }
  if (error && !communityData) {
    return <CommunityNotFound />;
  }

  return (
    <>
      {communityData && <Header communityData={communityData} />}

      {/* Quick actions (no duplicate Join; that's handled in Header) */}
      <Box maxW="1060px" mx="auto" px={4} mb={4}>
        <HStack>
          {/* Edit name button removed */}
        </HStack>
      </Box>

      <PageContentLayout>
        {/* Left Content */}
        <>
          {communityData && <CommunityHighlights pinnedPosts={[]} communityData={communityData} />}
          <Posts
            communityData={communityData as any}
            userId={user?.uid}
            loadingUser={loadingUser}
          />
        </>
        {/* Right Content */}
        <>
          {communityData && <>
            <CommunityInfo communityData={communityData} />
            <CommunityRules communityData={communityData} />
          </>}
        </>
      </PageContentLayout>

  {/* Rename modal removed */}
    </>
  );
};

export default CommunityPage;

// Map upstream Group -> Community shape used by UI
export function toCommunity(obj: any): Community | null {
  if (!obj) return null;
  const id = String(obj.id ?? obj.groupId ?? obj._id ?? obj.code ?? "");
  const name = obj.displayName || obj.name || obj.groupName || obj.title || obj.code || id;
  if (!id) return null;
  const result: any = {
    id,
    creatorId: String(obj.ownerId ?? obj.creatorId ?? ""),
  numberOfMembers: Number(obj.numberOfMembers ?? obj.memberCount ?? obj.countUserJoin ?? 0) || 0,
    privacyType: (obj.privacyType || obj.communityType || "public").toLowerCase() as any,
    displayName: name,
  };
  const image = obj.imageURL || obj.imageUrl || obj.avatar;
  if (image) result.imageURL = image;
  const desc = obj.description || obj.desc || obj.about;
  if (desc) result.description = desc;
  if (Array.isArray(obj.rules)) result.rules = obj.rules;
  if (Array.isArray(obj.members)) result.members = obj.members;
  if (Array.isArray(obj.bannedUsers)) result.bannedUsers = obj.bannedUsers;
  if (Array.isArray(obj.pinnedPosts)) result.pinnedPosts = obj.pinnedPosts;
  return result as Community;
}

// SSR removed; client-side fetching is used instead.
