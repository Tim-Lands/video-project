export type SessionDate = {
	id: number;
	session_date: Date;
	from: Date;
	duration: number;
	instructor_id: number;
	enrolled_users_ids: number[];
};

export type Lesson = {
	id: number;
	session_date: Date;
	from: Date;
	duration: number;
	instructor_id: number;
	enrolled_users_ids: number[];
};

export type RoomResponse = Lesson | SessionDate;
