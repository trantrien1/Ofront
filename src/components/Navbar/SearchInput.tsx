import React from "react";
import { Flex, InputGroup, InputLeftElement, Input } from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
type User = { uid: string; email?: string | null };

type SearchInputProps = {
  user: User;
};

const SearchInput: React.FC<SearchInputProps> = ({ user }) => {
  return (
    <Flex
      flexGrow={1}
      maxWidth={{ base: "200px", sm: "250px", md: "350px", lg: "500px" }}
      width="100%"
      mr={{ base: 2, md: 4 }}
      ml={{ base: 2, md: 4, lg: 6 }}
      align="center"
    >
      <InputGroup>
        <InputLeftElement pointerEvents="none" color="gray.400">
          <SearchIcon mb="2px" />
        </InputLeftElement>

        <Input
          placeholder="Search"
          fontSize={{ base: "10pt", md: "11pt" }}
          _placeholder={{ color: "gray.500" }}
          _hover={{ bg: "white", border: "1px solid", borderColor: "blue.400" }}
          _focus={{
            outline: "none",
            border: "1px solid",
            borderColor: "blue.500",
            boxShadow: "0 0 0 1px blue.500",
          }}
          height={{ base: "32px", md: "36px" }}
          borderRadius="full"
          bg="gray.50"
        />
      </InputGroup>
    </Flex>
  );
};
export default SearchInput;
