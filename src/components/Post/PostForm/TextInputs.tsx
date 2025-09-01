import React from "react";
import { Stack, Input, Textarea, Flex, Button, useColorModeValue } from "@chakra-ui/react";

type TextInputsProps = {
  textInputs: {
    title: string;
    body: string;
  };
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleCreatePost: () => void;
  loading: boolean;
};

const TextInputs: React.FC<TextInputsProps> = ({
  textInputs,
  onChange,
  handleCreatePost,
  loading,
}) => {
  const inputBg = useColorModeValue("white", "gray.700");
  const inputBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  const inputFocusBorder = useColorModeValue("blue.500", "blue.300");
  const placeholderColor = useColorModeValue("gray.500", "whiteAlpha.500");
  return (
    <Stack spacing={3} width="100%">
      <Input
        name="title"
        value={textInputs.title}
        onChange={onChange}
        bg={inputBg}
        borderColor={inputBorder}
        _placeholder={{ color: placeholderColor }}
        _focus={{
          outline: "none",
          bg: inputBg,
          border: "1px solid",
          borderColor: inputFocusBorder,
        }}
        fontSize="10pt"
        borderRadius={4}
        placeholder="Title"
      />
      <Textarea
        name="body"
        value={textInputs.body}
        onChange={onChange}
        fontSize="10pt"
        placeholder="Text (optional)"
        bg={inputBg}
        borderColor={inputBorder}
        _placeholder={{ color: placeholderColor }}
        _focus={{
          outline: "none",
          bg: inputBg,
          border: "1px solid",
          borderColor: inputFocusBorder,
        }}
        height="100px"
      />
      <Flex justify="flex-end">
        <Button
          height="34px"
          padding="0px 30px"
          disabled={!textInputs.title}
          isLoading={loading}
          onClick={handleCreatePost}
        >
          Post
        </Button>
      </Flex>
    </Stack>
  );
};
export default TextInputs;
