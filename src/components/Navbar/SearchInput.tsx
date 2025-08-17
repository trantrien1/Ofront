import React from "react";
import { Flex, InputGroup, InputLeftElement, Input } from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { auth } from "firebase-admin";
import { user } from "firebase-functions/v1/auth";
import { User } from "firebase/auth";

type SearchInputProps = {
  user: User;
};

const SearchInput: React.FC<SearchInputProps> = ({ user }) => {
  return (
    <Flex
      flexGrow={1} // Cho phép chiếm hết không gian ngang còn lại
      maxWidth={{ base: "200px", sm: "250px", md: "350px", lg: "500px" }} // Giới hạn tối đa chiều rộng theo breakpoint
      width="100%" // Chiều rộng chiếm hết khối Flex
      mr={{ base: 2, md: 4 }} // Margin phải (cách các thành phần bên phải)
      ml={{ base: 2, md: 4, lg: 6 }} // Margin trái (cách logo/menu)
      align="center" // Canh giữa theo trục dọc
    >
      <InputGroup>
        {/* Icon search nằm bên trái ô input */}
        <InputLeftElement
          pointerEvents="none" // Không cho click vào icon
          color="gray.400" // Màu của icon
        >
          <SearchIcon mb="2px" /> {/* Dịch icon xuống chút cho cân đối */}
        </InputLeftElement>

        <Input
          placeholder="Search" // Placeholder mặc định
          fontSize={{ base: "10pt", md: "11pt" }} // Font size responsive
          _placeholder={{ color: "gray.500" }} // Màu chữ placeholder
          
          // Hiệu ứng hover
          _hover={{
            bg: "white",
            border: "1px solid",
            borderColor: "blue.400",
          }}

          // Hiệu ứng focus (khi click vào input)
          _focus={{
            outline: "none",
            border: "1px solid",
            borderColor: "blue.500",
            boxShadow: "0 0 0 1px blue.500", // thêm viền sáng đẹp hơn
          }}

          height={{ base: "32px", md: "36px" }} // Chiều cao responsive
          borderRadius="full" // Góc bo tròn full (pill shape)
          bg="gray.50" // Màu nền mặc định
        />
      </InputGroup>
    </Flex>
  );
};
export default SearchInput;
