import { useEffect, useState } from "react";
import type { NextPage, GetServerSideProps } from "next";
import { useRecoilState } from "recoil";
import { Community, communityState } from "../../../atoms/communitiesAtom";
import CommunityNotFound from "../../../components/Community/CommunityNotFound";
import CommunityInfo from "../../../components/Community/CommunityInfo";
import Header from "../../../components/Community/Header";
import CommunityRules from "../../../components/Community/CommunityRules";
import CommunityHighlights from "../../../components/Community/CommunityHighlights";
import PageContentLayout from "../../../components/Layout/PageContent";
import Posts from "../../../components/Post/Posts";
import { Box, Button, HStack, Input, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, useToast } from "@chakra-ui/react";

interface CommunityPageProps {
  communityData: Community;
}

const CommunityPage: NextPage<CommunityPageProps> = ({ communityData }) => {
  const user = null as any;
  const loadingUser = false;

  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setCommunityStateValue((prev) => ({
      ...prev,
      currentCommunity: communityData,
    }));
  }, [communityData]);

  if (!communityData) {
    return <CommunityNotFound />;
  }

  return (
    <>
      <Header communityData={communityData} />

      {/* Quick actions (no duplicate Join; that's handled in Header) */}
      <Box maxW="1060px" mx="auto" px={4} mb={4}>
        <HStack>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNewName(communityData.displayName || "");
              onOpen();
            }}
          >
            Edit name
          </Button>
        </HStack>
      </Box>

      <PageContentLayout>
        {/* Left Content */}
        <>
          <CommunityHighlights pinnedPosts={[]} communityData={communityData} />
          <Posts
            communityData={communityData}
            userId={user?.uid}
            loadingUser={loadingUser}
          />
        </>
        {/* Right Content */}
        <>
          <CommunityInfo communityData={communityData} />
          <CommunityRules communityData={communityData} />
        </>
      </PageContentLayout>

      {/* Rename modal (demo) */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Rename community</ModalHeader>
          <ModalBody>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New name"
            />
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => {
                toast({
                  status: "success",
                  title: "Renamed (demo)",
                  description: `Tên mới: ${newName}`,
                });
                onClose();
              }}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
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
    numberOfMembers: Number(obj.numberOfMembers ?? obj.memberCount ?? 0) || 0,
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

export const getServerSideProps: GetServerSideProps<CommunityPageProps> = async (ctx) => {
  try {
    const id = String(ctx.params?.community || "");
    if (!id) return { notFound: true };

    const cookie = ctx.req.headers.cookie || "";
    const proto = (ctx.req.headers["x-forwarded-proto"] as string) || "http";
    const host = ctx.req.headers.host;
    const base = `${proto}://${host}`;
    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";

    const tryFetch = async (url: string, hdrs?: Record<string,string>) => {
      try {
        const r = await fetch(url, { headers: { ...(hdrs||{}), cookie } });
        const text = await r.text();
        let data: any; try { data = JSON.parse(text); } catch { data = text; }
        return { ok: r.ok, status: r.status, data } as { ok: boolean; status: number; data: any };
      } catch (e: any) { return { ok: false, status: 0, data: { error: e?.message || String(e) } } as { ok: boolean; status: number; data: any }; }
    };

    const attempts = [
      { label: 'local_by_id', url: `${base}/api/group/get/${encodeURIComponent(id)}` },
      { label: 'local_by_id_public', url: `${base}/api/group/get/${encodeURIComponent(id)}`, headers: { 'x-public': '1' } as Record<string,string> },
      { label: 'upstream_list_name', url: `${upstream}/group/get/all?name=${encodeURIComponent(id)}` },
      { label: 'upstream_list', url: `${upstream}/group/get/all` },
    ];

    for (const a of attempts) {
      const r = await tryFetch(a.url, a.headers);
      if (r.ok && r.data) {
        const obj = (r.data && typeof r.data === 'object') ? (r.data.data ?? r.data.group ?? r.data) : r.data;
        const arr = Array.isArray(obj?.content) ? obj.content : Array.isArray(obj?.data?.content) ? obj.data.content : undefined;
        const candidate = Array.isArray(arr) ? (arr[0] || null) : obj;
        const comm = toCommunity(candidate);
        if (comm) {
          if (process.env.NODE_ENV !== 'production') ctx.res.setHeader('x-gssp-group-source', a.label);
          return { props: { communityData: comm } };
        }
      }
    }

  const byUser = await tryFetch(`${base}/api/group/get/by-user`);
  if (byUser.ok) {
      const list = (Array.isArray(byUser.data) ? byUser.data : (Array.isArray(byUser.data?.data) ? byUser.data.data : (Array.isArray(byUser.data?.content) ? byUser.data.content : []))) as any[];
      const found = list.find((g: any) => String(g.id ?? g.groupId ?? g.code ?? g._id) === id || String(g.code ?? '') === id);
      const comm = toCommunity(found);
      if (comm) {
        if (process.env.NODE_ENV !== 'production') ctx.res.setHeader('x-gssp-group-source', 'by_user_search');
        return { props: { communityData: comm } };
      }
    }

    const minimal = toCommunity({ id, name: `Community ${id}` }) || {
      id,
      creatorId: "",
      numberOfMembers: 0,
      privacyType: "public" as const,
      displayName: `Community ${id}`,
    };
    return { props: { communityData: minimal as any } };
  } catch (e) {
    const id = String(ctx.params?.community || "");
    const minimal = id ? (toCommunity({ id, name: `Community ${id}` }) || {
      id,
      creatorId: "",
      numberOfMembers: 0,
      privacyType: "public" as const,
      displayName: `Community ${id}`,
    }) : (null as any);
    return { props: { communityData: minimal } };
  }
};
