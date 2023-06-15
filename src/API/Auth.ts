import { User } from "../resources/responses/meResponse";
import API from "../config/API";
export const getUserByToken = async ({
  token,
}: {
  token: string;
}): Promise<User | undefined> => {
  try {
    const res = await API.get("/api/me", {
      headers: {
        Authorization: `${token}`,
      },
    });
    return res.data.user_details;
  } catch (err: any) {
    console.log('*******************', err, '*********************')
    return undefined;
  }
};
