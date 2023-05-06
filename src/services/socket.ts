import { Socket } from "socket.io";
import { authorizationService } from "./Authorization";
import { User } from "../resources/responses/meResponse";
import { SFUClient } from "./sfuClient";
const rooms = {};
const sfuClient = new SFUClient();

async function handleConnection(socket: Socket, callback: any) {
  try {
    console.log("handling connection");
    const res = await authorizeConnection(socket);
    const user = res?.user;
    const roomName = res?.roomName;
    if (!user || !roomName) {
      console.log("unauthorized user");
      socket.disconnect();
      return;
    }
    console.log("authorized user");
    const rtpCapabilities = await joinOrCreateRoom(socket, roomName);
    callback({ rtpCapabilities });
    socket.on("chat-message", (message: string) => {
      // handle chat message
    });

    socket.on("join-session", (sessionId: string) => {
      // handle user joining a session
    });

    socket.on("disconnect", () => {
      // handle user disconnection
    });
  } catch (err: any) {
    console.log(err);
  }
}

async function authorizeConnection(socket: Socket) {
  console.log("entered in the authorizeConnection method");
  const token = socket.handshake.auth.token;
  const sessionDateId = socket.handshake.query.id;
  if (typeof sessionDateId != "string") return undefined;
  console.log("before calling authorize participant api");
  const user = await authorizationService.authorizeParticipant(
    parseInt(sessionDateId),
    token
  );
  console.log("authorize function has been executed successfully");
  return { user, roomName: sessionDateId };
}

async function joinOrCreateRoom(socket: Socket, roomName: string) {
  const router1 = await sfuClient.createRoom(roomName, socket.id);
  sfuClient.peers[socket.id] = {
    socket,
    roomName, // Name for the Router this Peer joined
    transports: [],
    producers: [],
    consumers: [],
    peerDetails: {
      name: "",
      isAdmin: false, // Is this Peer the Admin?
    },
  };

  // get Router RTP Capabilities
  const rtpCapabilities = router1.rtpCapabilities;

  // call callback from the client and send back the rtpCapabilities
  return rtpCapabilities;
}
export default {
  handleConnection,
};
