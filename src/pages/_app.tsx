import { ChakraProvider } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import { RecoilRoot } from "recoil";
import { theme } from "../chakra/theme";
import Layout from "../components/Layout";
import { useAuthRestore } from "../hooks/useAuthRestore";
// Firebase removed
import "../styles/globals.css";

function AppWithAuth(props: AppProps) {
  useAuthRestore();
  
  return (
    <Layout>
      <props.Component {...props.pageProps} />
    </Layout>
  );
}

function MyApp(props: AppProps) {
  // TEMPORARILY DISABLE AUTH RESTORE FOR DEBUGGING
  // useAuthRestore();
  
  return (
    <RecoilRoot>
      <ChakraProvider theme={theme}>
        <AppWithAuth {...props} />
      </ChakraProvider>
    </RecoilRoot>
  );
}

export default MyApp;
