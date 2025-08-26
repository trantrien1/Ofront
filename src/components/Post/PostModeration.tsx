import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Icon,
  Stack,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  useToast,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { 
  FaTrash, 
  FaThumbtack, 
  FaBan, 
  FaExclamationTriangle,
  FaShieldAlt 
} from "react-icons/fa";
// Firebase removed
import { useCommunityPermissions } from "../../hooks/useCommunityPermissions";
import { BannedUser } from "../../atoms/communitiesAtom";

interface PostModerationProps {
  postId: string;
  communityId: string;
  authorId: string;
  authorName?: string;
  isPinned?: boolean;
  onPostDeleted?: () => void;
  onPostPinned?: () => void;
}

const PostModeration: React.FC<PostModerationProps> = ({
  postId,
  communityId,
  authorId,
  authorName,
  isPinned = false,
  onPostDeleted,
  onPostPinned,
}) => {
  const user = null as any;
  const toast = useToast();
  const { canDeletePosts, canPinPosts, canBanUsers } = useCommunityPermissions();
  
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isBanOpen, onOpen: onBanOpen, onClose: onBanClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  
  const [banReason, setBanReason] = useState("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editBody, setEditBody] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  const canModerate = useMemo(() => (
    canDeletePosts(communityId) || canPinPosts(communityId) || canBanUsers(communityId)
  ), [communityId, canBanUsers, canDeletePosts, canPinPosts]);

  
  if (!canModerate) return null;

  const handleDeletePost = async () => {
    try {
      const svc = await import("../../services/posts.service");
      await (svc as any).deletePost({ postId });
      toast({
        title: "Post deleted",
        status: "success",
        duration: 3000,
      });
      onPostDeleted?.();
      onDeleteClose();
    } catch (error) {
      toast({
        title: "Error deleting post",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handlePinPost = async () => {
    try {
      // TODO: toggle pin via API
      
      toast({
        title: isPinned ? "Post unpinned" : "Post pinned",
        status: "success",
        duration: 3000,
      });
      onPostPinned?.();
    } catch (error) {
      toast({
        title: "Error pinning post",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleEditPost = async () => {
    if (!editTitle.trim() && !editBody.trim()) return;
    setSavingEdit(true);
    try {
      const svc = await import("../../services/posts.service");
      await (svc as any).updatePost({ postId, title: editTitle, content: editBody });
      toast({ title: "Post updated", status: "success", duration: 3000 });
      onEditClose();
    } catch (e) {
      toast({ title: "Error updating post", status: "error", duration: 3000 });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleBanUser = async () => {
    if (!banReason.trim()) return;
    
    try {
      const bannedUser: BannedUser = {
        userId: authorId,
        bannedAt: new Date() as any,
        bannedBy: user?.uid || "",
        reason: banReason,
        displayName: authorName,
      };
      // TODO: call API to ban user
      
      toast({
        title: "User banned",
        status: "success",
        duration: 3000,
      });
      setBanReason("");
      onBanClose();
    } catch (error) {
      toast({
        title: "Error banning user",
        status: "error",
        duration: 3000,
      });
    }
  };

  return (
    <>
      <Flex align="center" gap={2} mt={2}>
        <Badge colorScheme="blue" fontSize="xs">
          <Icon as={FaShieldAlt} mr={1} />
          Mod Actions
        </Badge>
        
        {canDeletePosts(communityId) && (
          <Button
            size="xs"
            variant="outline"
            colorScheme="red"
            leftIcon={<FaTrash />}
            onClick={onDeleteOpen}
          >
            Delete
          </Button>
        )}
        {canDeletePosts(communityId) && (
          <Button
            size="xs"
            variant="outline"
            colorScheme="blue"
            onClick={() => {
              setEditTitle("");
              setEditBody("");
              onEditOpen();
            }}
          >
            Edit
          </Button>
        )}
        
        {canPinPosts(communityId) && (
          <Button
            size="xs"
            variant="outline"
            colorScheme={isPinned ? "gray" : "blue"}
            leftIcon={<FaThumbtack />}
            onClick={handlePinPost}
          >
            {isPinned ? "Unpin" : "Pin"}
          </Button>
        )}
        
        {canBanUsers(communityId) && authorId !== user.uid && (
          <Button
            size="xs"
            variant="outline"
            colorScheme="red"
            leftIcon={<FaBan />}
            onClick={onBanOpen}
          >
            Ban User
          </Button>
        )}
      </Flex>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Post</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex align="center" gap={2} mb={4}>
              <Icon as={FaExclamationTriangle} color="red.500" />
              <Text>Are you sure you want to delete this post? This action cannot be undone.</Text>
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDeletePost}>
              Delete Post
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Ban User Modal */}
      <Modal isOpen={isBanOpen} onClose={onBanClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ban User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Text>
                Ban <strong>{authorName || authorId}</strong> from this community?
              </Text>
              <Box>
                <Text fontSize="sm" fontWeight={600} mb={2}>
                  Reason for ban:
                </Text>
                <Textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter reason for banning this user..."
                  size="sm"
                />
              </Box>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onBanClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="red" 
              onClick={handleBanUser}
              isDisabled={!banReason.trim()}
            >
              Ban User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Post Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Post</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Box>
                <Text fontSize="sm" fontWeight={600} mb={1}>Title</Text>
                <Textarea
                  placeholder="Update title..."
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  size="sm"
                />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight={600} mb={1}>Body</Text>
                <Textarea
                  placeholder="Update content..."
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  size="sm"
                  minH="120px"
                />
              </Box>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleEditPost} isLoading={savingEdit}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default PostModeration;
