export type SessionDate = {
  id: number;
  session_date: Date;
  start_time: Date;
  duration: number;
  instructor_id: number;
  enrolled_users_ids: number[];
};
