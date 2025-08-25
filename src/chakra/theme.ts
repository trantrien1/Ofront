import { extendTheme } from "@chakra-ui/react";
import { Button } from "./button"; // đây là theme override object, không phải component React
import { Input } from "./input";   // theme override object

export const theme = extendTheme({
  colors: {
    brand: {
      100: "#FF3C00",
    },
  },
  fonts: {
    body: "Open Sans, sans-serif",
  },
  styles: {
    global: () => ({
      body: {
        bg: "gray.200",
      },
    }),
  },
  components: {
    Button,
    Input,
  },
});
