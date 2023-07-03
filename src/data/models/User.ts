import { Socket } from "socket.io";
import { User } from "../../resources/responses/meResponse";

export class UserModel {
	public dataSource: any = {};
	constructor() {}

	async addUser(user: User, socket: Socket) {
		this.dataSource[user.id] = { ...user, socket };
	}

	async removeUser(user_id: string) {
		delete this.dataSource[user_id];
	}

	async findUserById(user_id: string) {
        return this.dataSource[user_id]
    }
}
