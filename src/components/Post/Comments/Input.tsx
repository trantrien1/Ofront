import React from "react";
import { Flex, Textarea, Button, Text, useColorModeValue, Switch, Tooltip } from "@chakra-ui/react";
type User = { uid: string; email?: string; photoURL?: string; displayName?: string };
// ...

type CommentInputProps = {
  comment: string;
  setComment: (value: string) => void;
  loading: boolean;
  user?: User | null;
  onCreateComment: (comment: string, anonymous?: boolean) => void;
};

const CommentInput: React.FC<CommentInputProps> = ({
  comment,
  setComment,
  loading,
  user,
  onCreateComment,
}) => {
  // Precompute theme tokens
  const nameColor = useColorModeValue("blue.600", "blue.300");
  const inputBg = useColorModeValue("white", "gray.800");
  const inputBorder = useColorModeValue("gray.200", "gray.600");
  const placeholderCol = useColorModeValue("gray.500", "gray.400");
  const focusBorder = useColorModeValue("blue.500", "blue.300");
  const footerBg = useColorModeValue("gray.100", "gray.700");
  const footerBorder = useColorModeValue("gray.200", "gray.600");
  const [anonymous, setAnonymous] = React.useState(false);
  return (
    <Flex direction="column" position="relative">
      {user && (
        <>
          <Text mb={1}>
            Comment as{" "}
            <Text as="span" color={nameColor}>
              {user?.displayName || user?.email?.split("@")[0] || user?.uid || "user"}
            </Text>
          </Text>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Bạn nghĩ gì?"
            fontSize="10pt"
            borderRadius={4}
            minHeight="160px"
            pb={10}
            bg={inputBg}
            border="1px solid"
            borderColor={inputBorder}
            _placeholder={{ color: placeholderCol }}
            _focus={{
              outline: "none",
              bg: inputBg,
              border: "1px solid",
              borderColor: focusBorder,
            }}
          />
          <Flex
            position="absolute"
            left="1px"
            right={0.1}
            bottom="1px"
            justify="flex-end"
            bg={footerBg}
            borderTop="1px solid"
            borderColor={footerBorder}
            p="6px 8px"
            borderRadius="0px 0px 4px 4px"
          >
            <Flex align="center" gap={3} mr="auto">
              <Tooltip label="Khi bật, tên của bạn sẽ không hiển thị cùng bình luận." placement="top" hasArrow>
                <Text fontSize="sm" cursor="help">
                  {anonymous ? '👻 Đăng ẩn danh' : '👤 Đăng công khai'}
                </Text>
              </Tooltip>
              <Text fontSize="xs" mt={0} color="gray.500" display={{ base: 'none', md: 'block' }}>Bật để ẩn tên khi bình luận.</Text>
            </Flex>
            <Switch isChecked={anonymous} onChange={(e) => setAnonymous((e.target as HTMLInputElement).checked)} colorScheme="green" size="md" aria-label={anonymous ? 'Ẩn danh: Bật' : 'Ẩn danh: Tắt'} />
            <Button
              height="26px"
              disabled={!comment.length}
              isLoading={loading}
              colorScheme="blue"
              onClick={() => {
                onCreateComment(comment, anonymous);
              }}
            >
              Bình luận
            </Button>
          </Flex>
        </>
      )}
    </Flex>
  );
};
export default CommentInput;
