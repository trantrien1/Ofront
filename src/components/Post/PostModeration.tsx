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
        title: "Đã xóa bài viết",
        status: "success",
        duration: 3000,
      });
      onPostDeleted?.();
      onDeleteClose();
    } catch (error) {
      toast({
        title: "Lỗi khi xóa bài viết",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handlePinPost = async () => {
  toast({ title: "Chức năng này sẽ sớm ra mắt", status: "info", duration: 2500 });
  };

  const handleEditPost = async () => {
    if (!editTitle.trim() && !editBody.trim()) return;
    setSavingEdit(true);
    try {
      const svc = await import("../../services/posts.service");
      await (svc as any).updatePost({ postId, title: editTitle, content: editBody });
      toast({ title: "Bài viết đã được cập nhật", status: "success", duration: 3000 });
      onEditClose();
    } catch (e) {
      toast({ title: "Lỗi khi cập nhật bài viết", status: "error", duration: 3000 });
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
        title: "Người dùng đã bị cấm",
        status: "success",
        duration: 3000,
      });
      setBanReason("");
      onBanClose();
    } catch (error) {
      toast({
        title: "Lỗi khi cấm người dùng",
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
          Hành động của mod
        </Badge>
        
        {canDeletePosts(communityId) && (
          <Button
            size="xs"
            variant="outline"
            colorScheme="red"
            leftIcon={<FaTrash />}
            onClick={onDeleteOpen}
          >
            Xóa
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
            Chỉnh sửa
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
            Cấm người dùng
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
              <Text>Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.</Text>
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose}>
              Hủy
            </Button>
            <Button colorScheme="red" onClick={handleDeletePost}>
              Xóa bài viết
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Ban User Modal */}
      <Modal isOpen={isBanOpen} onClose={onBanClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cấm người dùng</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Text>
                Cấm <strong>{authorName || authorId}</strong> khỏi cộng đồng này?
              </Text>
              <Box>
                <Text fontSize="sm" fontWeight={600} mb={2}>
                  Lý do cấm:
                </Text>
                <Textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Nhập lý do cấm người dùng này..."
                  size="sm"
                />
              </Box>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onBanClose}>
              Hủy
            </Button>
            <Button 
              colorScheme="red" 
              onClick={handleBanUser}
              isDisabled={!banReason.trim()}
            >
              Cấm người dùng
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Post Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Chỉnh sửa bài viết</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Box>
                <Text fontSize="sm" fontWeight={600} mb={1}>Tiêu đề</Text>
                <Textarea
                  placeholder="Cập nhật tiêu đề..."
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
              Hủy
            </Button>
            <Button colorScheme="blue" onClick={handleEditPost} isLoading={savingEdit}>
              Lưu
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default PostModeration;
