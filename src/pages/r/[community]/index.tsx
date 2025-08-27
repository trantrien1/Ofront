import { useEffect, useState } from "react";
import type { NextPage } from "next";
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

      {/* Quick actions */}
      <Box maxW="1060px" mx="auto" px={4} mb={3}>
        <HStack>
          {/* Chỉ hiện toast giả lập khi bấm Join */}
          <Button
            size="sm"
            onClick={() => toast({ status: "info", title: "Joined (demo)" })}
          >
            Join
          </Button>

          {/* Mở modal đổi tên */}
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
