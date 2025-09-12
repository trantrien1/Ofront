import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  VStack,
  FormControl,
  FormLabel,
  useToast,
  Text,
  Select,
  Box,
  Flex,
  Icon,
  Image,
  Switch,
  Tooltip,
  useColorModeValue,
  Spinner,
} from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";
import { BsCardImage } from "react-icons/bs";
import { createPost } from "../../../services/posts.service";
import { useRouter } from "next/router";
import { getGroupsByUser, type Group } from "../../../services/groups.service";


type CreatePostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
};

const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postLocation, setPostLocation] = useState("personal"); // "personal" or "community"
  const [communityId, setCommunityId] = useState("");
  const [postType, setPostType] = useState("TEXT");
  const [anonymous, setAnonymous] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [communities, setCommunities] = useState<Group[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Theme tokens (hooks must not be called conditionally)
  const modalBg = useColorModeValue("white", "gray.800");
  const headerBorder = useColorModeValue("gray.200", "gray.700");
  const headerColor = useColorModeValue("gray.800", "gray.100");
  const hintColor = useColorModeValue("gray.500", "gray.400");
  const selectFocus = useColorModeValue("blue.500", "blue.300");
  const selectHover = useColorModeValue("gray.300", "gray.500");
  const inputBg = useColorModeValue("white", "gray.800");
  const inputBorder = useColorModeValue("gray.200", "gray.600");
  const titleCount = useColorModeValue("gray.500", "gray.400");
  const dashedBorder = useColorModeValue("gray.300", "gray.600");
  const dashedHoverBorder = useColorModeValue("gray.400", "gray.500");
  const dashedHoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const dashedIcon = useColorModeValue("gray.400", "gray.500");
  const dashedText = useColorModeValue("gray.600", "gray.300");
  const dashedSubText = useColorModeValue("gray.500", "gray.400");
  const footerBorder = useColorModeValue("gray.200", "gray.700");

  // Load user's communities when switching to community mode or when modal opens
  useEffect(() => {
    const fetch = async () => {
      setLoadingCommunities(true);
      try {
  const list = await getGroupsByUser({ ttlMs: 30000 });
        setCommunities(list);
        if (list.length && !communityId) setCommunityId(String(list[0].id));
      } catch (e) {
        console.error("Load communities failed", e);
        toast({ status: "error", title: "Không tải được danh sách cộng đồng" });
      } finally {
        setLoadingCommunities(false);
      }
    };
    if (isOpen && postLocation === "community") fetch();
  }, [isOpen, postLocation]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPostType("IMAGE");
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Thiếu tiêu đề",
        status: "error",
        duration: 3000,
      });
      return;
    }
    if (postLocation === "community" && !communityId) {
      toast({ title: "Hãy chọn cộng đồng", status: "error", duration: 3000 });
      return;
    }

    setIsLoading(true);
    try {
      let imageURL = "";
      
      // Nếu có ảnh, cần upload trước (tuỳ backend)
      if (selectedFile) {
        // Tạm thời dùng preview làm URL hiển thị
        imageURL = imagePreview;
      }

  const postData: any = {
        title: title.trim(),
        content: body.trim(), // Backend expects 'content'
        type: postType,
        groupId: postLocation === "community" ? Number(communityId) : undefined,
        imageURL: imageURL || null,
        anonymous, // primary key used by backend JSON (field is 'isAnonymous' in DTO -> serialized as 'anonymous')
        isAnonymous: anonymous, // include both just in case backend expects exact name
      };
      if (!postData.groupId) delete postData.groupId;
  try { console.log('[CreatePostModal] submitting postData=', JSON.stringify(postData)); } catch {}

      await createPost(postData);
      
      toast({
        title: "Bài đăng đang chờ duyệt",
        description: "Chúng tôi sẽ thông báo khi bài được phê duyệt.",
        status: "info",
        duration: 4000,
      });

      // Reset form
      setTitle("");
      setBody("");
      setPostLocation("personal");
  setCommunityId("");
      setPostType("TEXT");
      setSelectedFile(null);
      setImagePreview("");
  setAnonymous(false);
      
      onClose();
      // Stay within context: if posting to a community, remain in that community page
      if (postLocation === "community" && communityId) {
        const target = `/community/${encodeURIComponent(String(communityId))}`;
        try {
          if (router.asPath !== target) await router.push(target);
        } catch {}
      } else {
        // For personal posts, stay on current page; no redirect
      }
      onPostCreated?.();
  } catch (error: any) {
      toast({
    title: "Lỗi khi đăng bài",
    description: error?.message || "Đã có lỗi xảy ra",
    status: "error",
    duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    setPostType("TEXT");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent bg={modalBg}>
        <ModalHeader borderBottom="1px solid" borderColor={headerBorder} color={headerColor}>
          <Flex align="center" gap={2}>
            <Text>Tạo bài đăng</Text>
            {postLocation === "personal" && (
              <Text fontSize="sm" color={hintColor}>
                → Trang cá nhân
              </Text>
            )}
            {postLocation === "community" && (
              <Text fontSize="sm" color={hintColor}>
                → {communityId}
              </Text>
            )}
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Đăng bài lên</FormLabel>
              <Select
                value={postLocation}
                onChange={(e) => {
                  setPostLocation(e.target.value);
                  if (e.target.value === "personal") {
                    setCommunityId("");
                  }
                }}
                borderRadius="xl"
                boxShadow="sm"
                _focus={{ borderColor: selectFocus, boxShadow: "0 0 0 1px rgba(99,179,237,0.6)" }}
                _hover={{ borderColor: selectHover }}
                bg={inputBg}
                borderColor={inputBorder}
                >
                <option value="personal">📄 Trang cá nhân của tôi</option>
                <option value="community">🏘️ Cộng đồng</option>
              </Select>

            </FormControl>

    {postLocation === "community" && (
              <FormControl>
                <FormLabel>Chọn cộng đồng</FormLabel>
                <Select
                  value={communityId}
                  onChange={(e) => setCommunityId(e.target.value)}
                  placeholder={loadingCommunities ? "Đang tải..." : (communities.length ? "Chọn cộng đồng" : "Không có cộng đồng")}
      bg={inputBg}
      borderColor={inputBorder}
      _hover={{ borderColor: selectHover }}
      _focus={{ borderColor: selectFocus }}
                >
                  {communities.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel>Tiêu đề</FormLabel>
              <Input
                placeholder="Một tiêu đề thú vị"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
                bg={inputBg}
                borderColor={inputBorder}
                _hover={{ borderColor: selectHover }}
                _focus={{ borderColor: selectFocus }}
              />
              <Text fontSize="sm" color={titleCount} textAlign="right">
                {title.length}/300
              </Text>
            </FormControl>

            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <Flex align="center" gap={3}>
                <Tooltip label="Khi bật, tên của bạn sẽ không hiển thị cùng bài đăng." placement="top" hasArrow>
                  <Text fontSize="sm" cursor="help">
                    {anonymous ? '👻 Đăng ẩn danh' : '👤 Đăng công khai'}
                  </Text>
                </Tooltip>
                <Text fontSize="sm" color={hintColor} display={{ base: 'none', md: 'block' }}>
                  Bật để không hiển thị tên của bạn.
                </Text>
              </Flex>

              <Switch
                isChecked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                colorScheme="green"
                size="md"
                aria-label={anonymous ? 'Ẩn danh: Bật' : 'Ẩn danh: Tắt'}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Nội dung</FormLabel>
              <Textarea
                placeholder="Bạn đang nghĩ gì?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={1000}
                bg={inputBg}
                borderColor={inputBorder}
                _hover={{ borderColor: selectHover }}
                _focus={{ borderColor: selectFocus }}
              />
              <Text fontSize="sm" color={hintColor} textAlign="right">
                {body.length}/1000
              </Text>
            </FormControl>

            {/* Image Upload */}
            <Box width="100%">
        {!imagePreview ? (
                <Box
                  border="2px dashed"
          borderColor={dashedBorder}
                  borderRadius="md"
                  p={6}
                  textAlign="center"
                  cursor="pointer"
          _hover={{ borderColor: dashedHoverBorder, bg: dashedHoverBg }}
                  onClick={() => fileInputRef.current?.click()}
                >
          <Icon as={BsCardImage} fontSize="40px" color={dashedIcon} mb={2} />
          <Text color={dashedText}>Nhấn để tải ảnh lên</Text>
          <Text fontSize="sm" color={dashedSubText}>
                    Hỗ trợ JPG, PNG tối đa 10MB
                  </Text>
                </Box>
              ) : (
                <Box position="relative">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    borderRadius="md"
                    maxHeight="300px"
                    width="100%"
                    objectFit="contain"
                  />
                  <Button
                    position="absolute"
                    top={2}
                    right={2}
                    size="sm"
                    colorScheme="red"
                    onClick={removeImage}
                  >
                    Xóa bỏ
                  </Button>
                </Box>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                style={{ display: "none" }}
              />
            </Box>
          </VStack>
        </ModalBody>

  <ModalFooter borderTop="1px solid" borderColor={footerBorder}>
          <Button variant="outline" colorScheme="gray" mr={3} onClick={onClose}>
            Hủy
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isLoading}
            loadingText="Đang đăng..."
          >
            Đăng
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreatePostModal;
