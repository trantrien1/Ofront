import React, { useState } from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import { ModalView } from "../../../atoms/authModalAtom";
// Firebase removed
import InputItem from "../../Layout/InputItem";
import { UsersService, request } from "../../../services";
import { updateRequestToken } from "../../../services/request";
import nookies from "nookies";
import { useSetRecoilState } from "recoil";
import { userState } from "../../../atoms/userAtom";
import { authModalState } from "../../../atoms/authModalAtom";
import { useRouter } from "next/router";

type LoginProps = {
  toggleView: (view: ModalView) => void;
};

const Login: React.FC<LoginProps> = ({ toggleView }) => {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [formError, setFormError] = useState("");
  // This is a valid TSX component
  const loading = false;
  const authError: any = null;

  const setUser = useSetRecoilState(userState);
  const setModal = useSetRecoilState(authModalState);
  const router = useRouter();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formError) setFormError("");
    if (!form.username) {
      return setFormError("Please enter your username");
    }

    (async () => {
      try {
        // backend expects username/password
        const requestBody = { username: form.username, password: form.password };
        const data: any = await UsersService.login(requestBody);

        // data could be a string or object. Try to extract token
        let token: string | undefined;
        if (!data) throw new Error("Empty response from server");
        if (typeof data === "string") {
          // try parse
          try {
            const parsed = JSON.parse(data);
            token = parsed?.token || parsed?.accessToken || parsed?.data?.token;
          } catch (e) {
            // maybe backend returns token as raw string
            token = data;
          }
        } else if (typeof data === "object") {
          token = data?.token || data?.accessToken || data?.data?.token;
        }


        if (!token) {
          setFormError("Login succeeded but no token returned");
          return;
        }

        // normalize token: strip surrounding quotes and whitespace
        const normalize = (t?: string) => {
          if (!t) return t;
          let s = t.trim();
          if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
          if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1);
          return s;
        };
        token = normalize(token);

  // store cookie with long expiration (explicit SameSite/path to ensure browser sends it to local API)
  // Token is checked above; assert it's a string for TypeScript
        // only set cookie if token is a string (TypeScript guard)
        if (typeof token === "string") {
          try {
            // Primary method: use nookies
            nookies.set(undefined, "token", token, { 
              path: "/", 
              sameSite: "lax",
              maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
              httpOnly: false, // allow client-side access
              secure: false // set to true in production with HTTPS
            });
          } catch (e) {
            // Fallback method: direct document.cookie for environments like VS Code Simple Browser
            const expires = new Date();
            expires.setDate(expires.getDate() + 30); // 30 days
            document.cookie = `token=${token}; path=/; SameSite=Lax; expires=${expires.toUTCString()}`;
          }
          
          // BACKUP: Also store in localStorage for VS Code Simple Browser compatibility
          try {
            localStorage.setItem("authToken", token);
          } catch (e) {
            // ignore
          }
        }

        // set default header for axios instance used across services
        updateRequestToken(token);

        // decode token payload and set current user in Recoil (lightweight decode)
        let jwtPayload: any = null;
        if (token) {
          try {
            const part = (token as string).split(".")[1];
            const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
            jwtPayload = JSON.parse(json);
          } catch (e) {
            jwtPayload = null;
          }
        }

        const user = {
          uid: jwtPayload?.sub || jwtPayload?.uid || jwtPayload?.username || "",
          email: jwtPayload?.email || null,
          displayName: jwtPayload?.name || jwtPayload?.username || null,
          photoURL: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;

        setUser(user);
        
        // close modal
        setModal((s) => ({ ...s, open: false }));

        // navigate to main inside page
        router.push("/");
      } catch (err: any) {
        setFormError(err?.message || "Login failed");
      }
    })();
  };

  const onChange = ({
    target: { name, value },
  }: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={onSubmit}>
      <InputItem
        name="username"
        placeholder="username"
        type="text"
        mb={2}
        onChange={onChange}
      />
      <InputItem
        name="password"
        placeholder="password"
        type="password"
        onChange={onChange}
      />
      <Text textAlign="center" mt={2} fontSize="10pt" color="red">
        {formError}
      </Text>
      <Button
        width="100%"
        height="36px"
        mb={2}
        mt={2}
        type="submit"
        isLoading={loading}
      >
        Log In
      </Button>
      <Flex justifyContent="center" mb={2}>
        <Text fontSize="9pt" mr={1}>
          Forgot your password?
        </Text>
        <Text
          fontSize="9pt"
          color="blue.500"
          cursor="pointer"
          onClick={() => toggleView("resetPassword")}
        >
          Reset
        </Text>
      </Flex>
      <Flex fontSize="9pt" justifyContent="center">
        <Text mr={1}>New here?</Text>
        <Text
          color="blue.500"
          fontWeight={700}
          cursor="pointer"
          onClick={() => toggleView("signup")}
        >
          SIGN UP
        </Text>
      </Flex>
    </form>
  );
};
export default Login;
