import request from "./request";

export const getUserByUsername = async (username: string) => {
  const r = await request.get("users", { params: { username } });
  return r.data;
};

export default { getUserByUsername };
