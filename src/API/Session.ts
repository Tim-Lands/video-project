import API from "../config/API";
import { CustomError } from "../errors/CustomError";
import { SessionDate } from "../resources/responses/sessionDateResponse";
export const getSessionDateInfo = async (id: number): Promise<SessionDate> => {
  const res = await API.get(`/api/session_dates/${id}`);
  return res?.data;
};
