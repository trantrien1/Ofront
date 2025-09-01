import React from "react";
import { Flex, Textarea, Button, Text, useColorModeValue } from "@chakra-ui/react";
type User = { uid: string; email?: string; photoURL?: string; displayName?: string };
// ...

type CommentInputProps = {
  comment: string;
  setComment: (value: string) => void;
  loading: boolean;
  user?: User | null;
  onCreateComment: (comment: string) => void;
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
            placeholder="What are your thoughts?"
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
            <Button
              height="26px"
              disabled={!comment.length}
              isLoading={loading}
              colorScheme="blue"
              onClick={() => {
                console.log("=== COMMENT BUTTON CLICKED ===");
                console.log("Comment text:", comment);
                console.log("onCreateComment function:", typeof onCreateComment);
                console.log("User in CommentInput:", user);
                console.log("==================================");
                onCreateComment(comment);
              }}
            >
              Comment
            </Button>
          </Flex>
        </>
      )}
    </Flex>
  );
};
export default CommentInput;
