import React, { useState } from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import { ModalView } from "../../../atoms/authModalAtom";
// Firebase removed
import InputItem from "../../Layout/InputItem";
import { UsersService } from "../../../services";
import { useSetRecoilState } from "recoil";
import { authModalState } from "../../../atoms/authModalAtom";

type SignUpProps = {
  toggleView: (view: ModalView) => void;
};

const SignUp: React.FC<SignUpProps> = ({ toggleView }) => {
  const [form, setForm] = useState({
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
  });
  const [formError, setFormError] = useState("");
  const loading = false;
  const authError: any = null;

  const setModal = useSetRecoilState(authModalState);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formError) setFormError("");
    if (!form.email.includes("@")) {
  return setFormError("Vui lòng nhập email hợp lệ");
    }

    if (form.password !== form.confirmPassword) {
  return setFormError("Mật khẩu nhập lại không khớp");
    }

    (async () => {
      try {
        const payload = { username: form.username || form.email.split('@')[0], email: form.email, password: form.password };
        const data: any = await UsersService.register(payload);

  // Registration succeeded — prompt user to log in.
  // Open the auth modal and switch to the login view so the user can authenticate.
  setFormError("Đăng ký thành công. Vui lòng đăng nhập.");
  setModal((s) => ({ ...s, open: true, view: "login" }));
  // also call toggleView to update the modal's internal view if needed
  toggleView("login");
      } catch (err: any) {
        const msg = err?.userMessage || err?.message;
        setFormError(msg || "Đăng ký thất bại");
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
        name="email"
        placeholder="email"
        type="text"
        mb={2}
        onChange={onChange}
      />
      <InputItem
        name="password"
        placeholder="password"
        type="password"
        mb={2}
        onChange={onChange}
      />
      <InputItem
        name="confirmPassword"
        placeholder="confirm password"
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
        Đăng kí
      </Button>
      <Flex fontSize="9pt" justifyContent="center">
        <Text mr={1}>Bạn đã có tài khoản?</Text>
        <Text
          color="blue.500"
          fontWeight={700}
          cursor="pointer"
          onClick={() => toggleView("login")}
        >
          ĐĂNG NHẬP
        </Text>
      </Flex>
    </form>
  );
};
export default SignUp;
