import { User } from "../resources/responses/meResponse";

const API = require("../config/API");
export const getUserByToken = async ({
  token,
}: {
  token: string;
}): Promise<User> => {
  const res = await API.get("/api/me", {
    Headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};
