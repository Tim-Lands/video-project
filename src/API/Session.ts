import API from "../config/API";
import { CustomError } from "../errors/CustomError";
import { SessionDate } from "../resources/responses/roomResponses";
const getSessionDateInfo = async (id: number): Promise<SessionDate> => {
	const res = await API.get(`/api/session_dates/${id}`);
	return res?.data.data;
};

async function markStarted(id: number, token: string) {
	const res = await API.post(`/api/session_dates/${id}/start`,{}, {headers:{Authorization:`Bearer ${token}`}});
	return res?.data.data;
}

export const sessionApi = {
	getSessionDateInfo,
	markStarted,
};
