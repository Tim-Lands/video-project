import express, { Request, Response, Application } from 'express';
import { Socket } from 'socket.io';
const httpServer = require('http')

const app: Application = express()
const server = httpServer.createServer(app);
const cors = require("cors");
const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
	}
});

app.use(cors());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
	res.send('Running');
});

io.use(async (socket: Socket, next: Function) => {
	console.log(socket?.handshake?.query);

	const token: any = socket?.handshake?.query.token;
	const isAuthorized = token ? await authorizeToken({ token }) : false;
	if (isAuthorized)
		next();
	else
		next(new Error("Authentication error"));
});

io.on("connection", (socket: Socket) => {
	socket.emit("me", socket.id);
	socket.on("disconnect", () => {
		socket.broadcast.emit("callEnded")
	});

	socket.on("callUser", ({ userToCall, signalData, from, name }: { userToCall: number, signalData: any, from: number, name: string }) => {
		io.to(userToCall).emit("callUser", { signal: signalData, from, name });
	});

	socket.on("answerCall", (data: any) => {
		console.log(data.to)
		io.to(data.to).emit("callAccepted", data.signal)
	});
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
