import { Server } from "socket.io";
import { UninitializedClassException } from "../exceptions/UninitializedClass";

export class SocketIOConnection {
	static instance: SocketIOConnection;
	io: Server;

	private constructor(server: any) {
		this.io = new Server(server, { cors: { origin: "*" } });
	}

	public static getSocketServer() {
		if (!SocketIOConnection.instance)
			throw new UninitializedClassException();
		else return SocketIOConnection.instance;
	}

	public static init(server: any) {
		SocketIOConnection.instance = new SocketIOConnection(server);
		return SocketIOConnection.instance;
	}

	public emitToRoom(roomName: string, event: string) {
		this.io.to(roomName).emit(event);
	}
}
