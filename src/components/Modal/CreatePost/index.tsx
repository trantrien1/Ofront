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
} from "@chakra-ui/react";
import { useState, useRef } from "react";
import { BsCardImage, BsPerson, BsPeople } from "react-icons/bs";
import { createPost } from "../../../services/posts.service";

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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postLocation, setPostLocation] = useState("personal"); // "personal" or "community"
  const [communityId, setCommunityId] = useState("general");
  const [postType, setPostType] = useState("TEXT");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

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
        title: "Title is required",
        status: "error",
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      let imageURL = "";
      
      // If there's an image, upload it first (you might need to implement image upload)
      if (selectedFile) {
        // For now, we'll use a placeholder or skip image upload
        // You can implement image upload to a service like Cloudinary, AWS S3, etc.
        imageURL = imagePreview; // Temporary - in real app, upload to server
      }

      const postData = {
        title: title.trim(),
        body: body.trim(),
        communityId: postLocation === "community" ? communityId : null,
        postType,
        imageURL: imageURL || null,
        isPersonalPost: postLocation === "personal",
      };

      await createPost(postData);
      
      toast({
        title: "Post created successfully!",
        status: "success",
        duration: 3000,
      });

      // Reset form
      setTitle("");
      setBody("");
      setPostLocation("personal");
      setCommunityId("general");
      setPostType("TEXT");
      setSelectedFile(null);
      setImagePreview("");
      
      onClose();
      onPostCreated?.();
    } catch (error: any) {
      toast({
        title: "Error creating post",
        description: error?.message || "Something went wrong",
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
      <ModalContent>
        <ModalHeader>
          <Flex align="center" gap={2}>
            <Text>Create a post</Text>
            {postLocation === "personal" && (
              <Text fontSize="sm" color="gray.500">
                → Personal Page
              </Text>
            )}
            {postLocation === "community" && (
              <Text fontSize="sm" color="gray.500">
                → r/{communityId}
              </Text>
            )}
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Post to</FormLabel>
              <Select
                value={postLocation}
                onChange={(e) => {
                  setPostLocation(e.target.value);
                  // Reset community selection when switching
                  if (e.target.value === "personal") {
                    setCommunityId("general");
                  }
                }}
              >
                <option value="personal">📄 My Personal Page</option>
                <option value="community">🏘️ Community</option>
              </Select>
            </FormControl>

            {postLocation === "community" && (
              <FormControl>
                <FormLabel>Choose Community</FormLabel>
                <Select
                  value={communityId}
                  onChange={(e) => setCommunityId(e.target.value)}
                >
                  <option value="general">r/general</option>
                  <option value="technology">r/technology</option>
                  <option value="programming">r/programming</option>
                  <option value="news">r/news</option>
                  <option value="gaming">r/gaming</option>
                  <option value="music">r/music</option>
                  <option value="art">r/art</option>
                  <option value="science">r/science</option>
                  <option value="food">r/food</option>
                  <option value="travel">r/travel</option>
                </Select>
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                placeholder="An interesting title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
              />
              <Text fontSize="sm" color="gray.500" textAlign="right">
                {title.length}/300
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Text (optional)</FormLabel>
              <Textarea
                placeholder="What are your thoughts?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <Text fontSize="sm" color="gray.500" textAlign="right">
                {body.length}/1000
              </Text>
            </FormControl>

            {/* Image Upload */}
            <Box width="100%">
              {!imagePreview ? (
                <Box
                  border="2px dashed"
                  borderColor="gray.300"
                  borderRadius="md"
                  p={6}
                  textAlign="center"
                  cursor="pointer"
                  _hover={{ borderColor: "gray.400", bg: "gray.50" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon as={BsCardImage} fontSize="40px" color="gray.400" mb={2} />
                  <Text color="gray.500">Click to upload an image</Text>
                  <Text fontSize="sm" color="gray.400">
                    JPG, PNG up to 10MB
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
                    Remove
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

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isLoading}
            loadingText="Creating..."
          >
            Post
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreatePostModal;
