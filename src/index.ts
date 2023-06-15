import express from "express";
import path from "path";
import { Server } from "socket.io";
import { Worker } from "mediasoup/node/lib/types";
import { getUserByToken } from "./API/Auth";
import { SFUClient } from "./services/sfuClient";
import socketService from "./services/socket";
import axios from "axios";
import SocketHandler from "./services/socket";
import { Socket } from "socket.io";

const httpServer = require("http");
const app = express();
const dirname = path.resolve();
const server = httpServer.createServer(app);

app.get("*", async (req: any, res: any, next: any) => {
  const path = "/sfu/";
  if (req.path.indexOf(path) == 0 && req.path.length > path.length)
    return next();

  res.send(
    `You need to specify a room name in the path e.g. 'https://127.0.0.1/sfu/room'`
  );
});
console.log(dirname);
app.use("/sfu/:room", express.static(path.join(dirname, "src", "public")));

const io = new Server(server, { cors: { origin: "*" } });

// socket.io namespace (could represent a room?)
const connections = io.of("/mediasoup");

/**
 * Worker
 * |-> Router(s)
 *     |-> Producer Transport(s)
 *         |-> Producer
 *     |-> Consumer Transport(s)
 *         |-> Consumer
 **/
const sfuClient = new SFUClient();

const authorizeConnection = async (socket: Socket) => {
  const token = socket.handshake.auth.token;
  const user = await getUserByToken({ token });

  if (!user) {
    console.log(token, "&&&&", socket.handshake);
    console.log("unauthorized user");
    socket.disconnect();
    return;
  }
  socket.emit("connection-success", {
    socketId: socket.id,
  });
  return token;
};
sfuClient.createAndGetWorker().then((worker: Worker) => {
  // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
  // [ { socketId1, roomName1, transport, consumer }, ... ]
  // [ { socketId1, roomName1, producer, }, ... ]
  // [ { socketId1, roomName1, consumer, }, ... ]

  // We create a Worker as soon as our application starts

  /* connections.use(async (socket, next) => {
	console.log(socket.handshake.auth.token)
	const token = socket.handshake.auth.token;
	if (!token)
		return next(new Error('Bad credentials'))
	const auth = await authorizeToken({ token })
	if (auth) {
		socket.data.current_user = auth
		next()
	}
	return next(new Error('Bad credentials'))
}) */

  connections.on("connection", async (socket) => {
    const token = await authorizeConnection(socket);
    const socketHandler = new SocketHandler(sfuClient, socket, token);
    socketHandler.handleConnection();
    // socket.on("joinRoom", async ({ roomName }, callback) => {
    //   // create Router if it does not exist
    //   // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
    //   const { current_user } = socket.data;
    //   // const is_member_of_session = await isMemberOfSession(roomName, current_user.id)
    //   /* if (!is_member_of_session){
    // 	return socket.send('error', new Error("unauthorized"))

    // } */
    //   const router1 = await sfuClient.createRoom(roomName, socket.id);

    //   sfuClient.peers[socket.id] = {
    //     socket,
    //     roomName, // Name for the Router this Peer joined
    //     transports: [],
    //     producers: [],
    //     consumers: [],
    //     peerDetails: {
    //       name: "",
    //       isAdmin: false, // Is this Peer the Admin?
    //     },
    //   };

    //   // get Router RTP Capabilities
    //   const rtpCapabilities = router1.rtpCapabilities;

    //   // call callback from the client and send back the rtpCapabilities
    //   callback({ rtpCapabilities });
    // });

    socket.on("test-producers", async () => {
      const producers = await sfuClient.producerModel.findAll();
      const consumers = await sfuClient.consumerModel.findAll();
      const transporters = await sfuClient.transportModel.findAll();
      console.log(producers);
      console.log("********************************");
      console.log(consumers);
      console.log("********************************");
      console.log(transporters);
      console.log("************************************");
      console.log(sfuClient.peers);
    });

    socket.on("mute-audio", async () => {
      // await sfuClient.pauseProducerBySocketId(socket.id);
    });
  });
});

server.listen(5000, () => console.log(`Server is running on port ${5000}`));
