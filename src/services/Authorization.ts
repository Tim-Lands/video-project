import { getUserByToken } from "../API/Auth";
import { sessionApi } from "../API/Session";
import { UnauthorizedError } from "../errors/UnauthorizedError";
import { User } from "../resources/responses/meResponse";
import { SessionDate } from "../resources/responses/roomResponses";

const authorizeParticipant = async (
	id: number,
	token: string
): Promise<{ user: User; session: SessionDate }> => {
	if (!token) throw new UnauthorizedError();
	const user: User | undefined = await getUserByToken({ token });
	if (!user) throw new UnauthorizedError();
	const sessionDateInfo = await sessionApi.getSessionDateInfo(id);
	if (sessionDateInfo.instructor_id == user.id) {
		user.is_instructor = true;
		return { user, session: sessionDateInfo };
	} else if (sessionDateInfo.enrolled_users_ids.includes(user.id)) {
		user.is_instructor = false;
		return { user, session: sessionDateInfo };
	} else throw new UnauthorizedError();
};
export const authorizationService = {
	authorizeParticipant,
};
