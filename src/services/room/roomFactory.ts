import { LessonHandler } from "./lessonHandler";
import { SessionHandler } from "./sessionHandler";

export function getRoomHandler(type:"lesson"|"session"){
    return type =="lesson" ? new LessonHandler():new SessionHandler()
}

