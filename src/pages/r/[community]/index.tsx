import { useEffect, useState } from "react";
// Firebase removed
import type { GetServerSidePropsContext, NextPage } from "next";
// Firebase removed
import { useRecoilState } from "recoil";
import safeJsonStringify from "safe-json-stringify";
import { Community, communityState } from "../../../atoms/communitiesAtom";
import CommunityNotFound from "../../../components/Community/CommunityNotFound";
import CommunityInfo from "../../../components/Community/CommunityInfo";
import Header from "../../../components/Community/Header";
import CommunityRules from "../../../components/Community/CommunityRules";
import CommunityHighlights from "../../../components/Community/CommunityHighlights";
import PageContentLayout from "../../../components/Layout/PageContent";
import Posts from "../../../components/Post/Posts";
import { usePinnedPosts } from "../../../hooks/usePinnedPosts";
import { Box, Button, HStack, useToast, Input, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@chakra-ui/react";
import { joinGroup, renameGroup } from "../../../services/groups.service";
// Firebase removed

interface CommunityPageProps {
  communityData: Community;
}

const CommunityPage: NextPage<CommunityPageProps> = ({ communityData }) => {
  const user = null as any; const loadingUser = false;

  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newName, setNewName] = useState("");

  const { pinnedPosts, loading: loadingPinnedPosts } = usePinnedPosts(
    communityData.pinnedPosts || []
  );

  // useEffect(() => {
  //   // First time the user has navigated to this community page during session - add to cache
  //   const firstSessionVisit =
  //     !communityStateValue.visitedCommunities[communityData.id!];

  //   if (firstSessionVisit) {
  //     setCommunityStateValue((prev) => ({
  //       ...prev,
  //       visitedCommunities: {
  //         ...prev.visitedCommunities,
  //         [communityData.id!]: communityData,
  //       },
  //     }));
  //   }
  // }, [communityData]);

  useEffect(() => {
    setCommunityStateValue((prev) => ({
      ...prev,
      currentCommunity: communityData,
    }));
  }, [communityData]);

  // Community was not found in the database
  if (!communityData) {
    return <CommunityNotFound />;
  }

  return (
    <>
      <Header communityData={communityData} />
      {/* Quick actions */}
      <Box maxW="1060px" mx="auto" px={4} mb={3}>
        <HStack>
          <Button size="sm" onClick={async()=>{ try { await joinGroup(communityData.id); toast({status:'success', title:'Joined'});} catch(e:any){ toast({status:'error', title:'Join failed', description:e?.message}); } }}>Join</Button>
          <Button size="sm" variant="outline" onClick={()=>{ setNewName(communityData.displayName || ""); onOpen(); }}>Edit name</Button>
        </HStack>
      </Box>
      <PageContentLayout>
        {/* Left Content */}
        <>
          <CommunityHighlights 
            pinnedPosts={pinnedPosts}
            communityData={communityData}
          />
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

      {/* Rename modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Rename community</ModalHeader>
          <ModalBody>
            <Input value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder="New name" />
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={async()=>{ try { await renameGroup(communityData.id, newName.trim()); toast({status:'success', title:'Renamed'}); onClose(); } catch(e:any){ toast({status:'error', title:'Rename failed', description:e?.message}); } }}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CommunityPage;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
  // Fetch community by slug from API/DB if available later; placeholder for now
    return {
      props: {
    communityData: "",
      },
    };
  } catch (error) {
    // Could create error page here
    console.error("getServerSideProps error - [community]", error);
    return {
      props: {
        communityData: "",
      },
    };
  }
}
