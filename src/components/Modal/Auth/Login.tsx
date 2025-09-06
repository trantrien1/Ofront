import React, { useState } from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import { ModalView } from "../../../atoms/authModalAtom";
// Firebase removed
import InputItem from "../../Layout/InputItem";
import { UsersService } from "../../../services";
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
  return setFormError("Vui lòng nhập tên đăng nhập");
    }

    (async () => {
      try {
        // backend expects username/password
        const requestBody = { username: form.username, password: form.password };
  const data: any = await UsersService.login(requestBody);
  try { console.log("[login] response typeof=", typeof data, "keys=", data && typeof data === 'object' ? Object.keys(data) : []); } catch {}

              if (!data) throw new Error("Empty response from server");
              // Do not set token on client; rely on HttpOnly cookie set by server via /api/login proxy
              // Extract role from response (backend returns role)
              const role: string | null = (typeof data === 'object' && data)
                ? (String((data as any)?.role || (data as any)?.data?.role || '').toLowerCase() || null)
                : null;

        const user = {
          uid: form.username, // minimal until a /me endpoint is available
          email: null,
          displayName: form.username,
          photoURL: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          role,
        } as any;

    // Debug: print essential fields so you can verify values after login
        try {
          const cookies = nookies.get(undefined);
          const cookieRole = cookies?.role || cookies?.ROLE || cookies?.userRole || cookies?.USER_ROLE || null;
          const cookieUser = cookies?.username || cookies?.user || null;
          if (typeof window !== "undefined") {
            // Print resolved role (token is HttpOnly and not exposed)
            console.log("Định dạng response khi login\n" + JSON.stringify({ role: role ?? undefined }, null, 4));
            console.log(
              "Login result (core fields):",
              JSON.stringify({ uid: user.uid, email: user.email, role: user.role ?? null }, null, 2)
            );
            console.log("[login] cookieRole=", cookieRole, "cookieUser=", cookieUser);
          }
        } catch {}

    // Persist role cookie/localStorage so client-side guards can read it (non-sensitive)
        try {
          if (role) {
            const roleStr = String(role).toLowerCase();
            nookies.set(undefined, "role", roleStr, {
              path: "/",
              sameSite: "lax",
              maxAge: 30 * 24 * 60 * 60,
              httpOnly: false,
              secure: false,
            });
            try {
              localStorage.setItem('role', roleStr);
              localStorage.setItem('username', form.username);
            } catch {}
          }
        } catch {}

        setUser(user);
        
        // close modal
        setModal((s) => ({ ...s, open: false }));

  // navigate to main application area
  router.push("/app");
      } catch (err: any) {
        const msg = err?.userMessage || err?.message;
        setFormError(msg || "Đăng nhập thất bại");
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
        Đăng nhập
      </Button>
      <Flex justifyContent="center" mb={2}>
        <Text fontSize="9pt" mr={1}>
          Quên mật khẩu đăng nhập?
        </Text>
        <Text
          fontSize="9pt"
          color="blue.500"
          cursor="pointer"
          onClick={() => toggleView("resetPassword")}
        >
          Đặt lại
        </Text>
      </Flex>
      <Flex fontSize="9pt" justifyContent="center">
        <Text mr={1}>Người mới?</Text>
        <Text
          color="blue.500"
          fontWeight={700}
          cursor="pointer"
          onClick={() => toggleView("signup")}
        >
          ĐĂNG KÝ
        </Text>
      </Flex>
    </form>
  );
};
export default Login;
