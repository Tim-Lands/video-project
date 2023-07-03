import { User } from "../../resources/responses/meResponse";
import { RoomResponse } from "../../resources/responses/roomResponses";
import { BaseRoomHandler } from "./baseRoomHandelr";

export class LessonHandler extends BaseRoomHandler {

    
    markAsStarted(room_id: number, token: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
	protected async authorizeParticipant(
		room_id: number,
		token: string
	): Promise<{ user: User; room: RoomResponse }> {
		throw new Error("Method not implemented.");
	}
}
