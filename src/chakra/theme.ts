import { extendTheme, ThemeConfig } from "@chakra-ui/react";
import { Button } from "./button"; // đây là theme override object, không phải component React
import { Input } from "./input";   // theme override object

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: true,
};

export const theme = extendTheme({
  config,
  colors: {
    brand: {
      100: "#FF3C00",
    },
  },
  fonts: {
    body: "Open Sans, sans-serif",
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === "dark" ? "gray.900" : "gray.100",
        color: props.colorMode === "dark" ? "gray.100" : "gray.800",
      },
    }),
  },
  components: {
    Button,
    Input,
  },
});
