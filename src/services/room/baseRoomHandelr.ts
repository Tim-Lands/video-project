import { UnavailableError } from "../../errors/Unavailable";
import { User } from "../../resources/responses/meResponse";
import { Lesson, RoomResponse } from "../../resources/responses/roomResponses";

export abstract class BaseRoomHandler {
	async authorizeConnection(room_id: string, token: string) {
		console.log("entered in the authorizeConnection method");
		if (typeof room_id != "string") return undefined;
		console.log("before calling authorize participant api");
		const { user, room } = await this.authorizeParticipant(
			parseInt(room_id),
			token
		);
		const session_availablitiy = this.checkSessionDateAvailablity(room);
		console.log("****************");
		console.log(session_availablitiy);
		console.log("*********************");
		if (session_availablitiy != "AVAILABLE") throw new UnavailableError();
		return { user, room };
	}

	checkSessionDateAvailablity(
		session_date: RoomResponse
	): "UNSTARTED" | "AVAILABLE" | "ENDED" {
		console.log(session_date);

		const start_date = new Date(
			`${new Date(session_date.session_date)
				.toISOString()
				.substring(0, 10)}T${session_date.from}`
		);
		const end_date = new Date(
			`${new Date(session_date.session_date)
				.toISOString()
				.substring(0, 10)}T${session_date.from}`
		);
		console.log(
			end_date.getTime() + 60 * 60 * session_date.duration,
			session_date.duration
		);
		end_date.setTime(end_date.getTime() + 60 * 60 * session_date.duration);
		const current_date = Date.now() + 60*60 * 5;
		console.log(end_date);
		console.log(
			`${current_date} - ${start_date.getTime()} - ${end_date.getTime()}`
		);
		if (current_date < start_date.getTime()) return "UNSTARTED";
		else if (current_date > end_date.getTime()) return "ENDED";
		else return "AVAILABLE";
	}
	async canMuteUser({
		user,
		userToMuteId,
		room,
	}: {
		user: User;
		userToMuteId: number;
		room: RoomResponse;
	}) {
		return (
			room.instructor_id == user.id &&
			room.enrolled_users_ids.includes(userToMuteId)
		);
	}

	protected abstract authorizeParticipant(
		room_id: number,
		token: string
	): Promise<{ user: User; room: RoomResponse }>;

	abstract markAsStarted(room_id: number, token: string): Promise<any>;
}
