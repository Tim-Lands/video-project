import { sessionApi } from "../../API/Session";
import { User } from "../../resources/responses/meResponse";
import { RoomResponse } from "../../resources/responses/roomResponses";
import { authorizationService } from "../Authorization";
import { BaseRoomHandler } from "./baseRoomHandelr";

export class SessionHandler extends BaseRoomHandler {
	async markAsStarted(room_id: number, token: string): Promise<any> {
		return await sessionApi.markStarted(room_id, token);
	}
	protected async authorizeParticipant(
		room_id: number,
		token: string
	): Promise<{ user: User; room: RoomResponse }> {
		const { user, session } =
			await authorizationService.authorizeParticipant(room_id, token);
		return { user, room: session };
	}
}
