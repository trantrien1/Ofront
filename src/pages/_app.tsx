import { ChakraProvider } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import { RecoilRoot } from "recoil";
import { theme } from "../chakra/theme";
import Layout from "../components/Layout";
import { useAuthRestore } from "../hooks/useAuthRestore";
import ClientOnlyWrapper from "../components/Layout/ClientOnlyWrapper";
import ToastProvider from "../components/Notifications/ToastProvider";
import { useStompNotifications } from "../hooks/useStompNotifications";
// Firebase removed
import "../styles/globals.css";



function AppWithAuth(props: AppProps) {
  useAuthRestore();
  // Enable real-time notifications (requires NEXT_PUBLIC_WS_URL)
  useStompNotifications(true);
  const Comp: any = props.Component as any;
  const noLayout = !!Comp?.noLayout;
  
  if (noLayout) {
    return (
      <ClientOnlyWrapper>
        <ToastProvider />
        <props.Component {...props.pageProps} />
      </ClientOnlyWrapper>
    );
  }
  return (
    <Layout>
      <ToastProvider />
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
