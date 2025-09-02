import React from "react";
import { Flex, InputGroup, InputLeftElement, Input, useColorModeValue } from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
type User = { uid: string; email?: string | null };

type SearchInputProps = {
  user: User;
};

const SearchInput: React.FC<SearchInputProps> = ({ user }) => {
  const bg = useColorModeValue("gray.50", "gray.700");
  const hoverBg = useColorModeValue("white", "gray.600");
  const focusBorder = useColorModeValue("blue.500", "blue.300");
  const placeholderCol = useColorModeValue("gray.500", "gray.300");
  const iconCol = useColorModeValue("gray.400", "gray.300");

  return (
    <Flex
      flexGrow={1}
      maxWidth={{ base: "200px", sm: "250px", md: "350px", lg: "500px" }}
      width="100%"
      mr={{ base: 2, md: 4 }}
      ml={{ base: 2, md: 4, lg: 6 }}
      align="center"
      zIndex="sticky"
      position="sticky"
    >
      <InputGroup>
        <InputLeftElement pointerEvents="none" color={iconCol}>
          <SearchIcon mb="2px" />
        </InputLeftElement>

        <Input
          placeholder="Search"
          fontSize={{ base: "10pt", md: "11pt" }}
          _placeholder={{ color: placeholderCol }}
          _hover={{ bg: hoverBg, border: "1px solid", borderColor: focusBorder }}
          _focus={{
            outline: "none",
            border: "1px solid",
            borderColor: focusBorder,
            boxShadow: `0 0 0 1px ${focusBorder}`,
          }}
          height={{ base: "32px", md: "36px" }}
          borderRadius="full"
          bg={bg}
        />
      </InputGroup>
    </Flex>
  );
};
export default SearchInput;
