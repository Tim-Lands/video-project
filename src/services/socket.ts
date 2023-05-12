import { Socket } from "socket.io";
import { authorizationService } from "./Authorization";
import { User } from "../resources/responses/meResponse";
import { SFUClient } from "./sfuClient";
import { getUserByToken } from "../API/Auth";

class SocketHandler {
  rooms = {};
  socketsWithTokens: { [key: string]: string };
  sfuClient: SFUClient;
  constructor(sfuClient: SFUClient) {
    this.sfuClient = sfuClient;
    this.socketsWithTokens = {};
  }
  async handleConnection(socket: Socket, callback: any) {
    try {
      console.log("handling connection");
      const token = socket.handshake.auth.token;
      const user = await getUserByToken({ token });

      if (!user) {
        console.log(token, "&&&&", socket.handshake);
        console.log("unauthorized user");
        socket.disconnect();
        return;
      }
      this.socketsWithTokens[socket.id] = token;
      socket.emit("connection-success", {
        socketId: socket.id,
      });

      socket.on("join_room", async ({ sessionDateId }, callback) => {
        // handle user joining a session
        console.log("rooom name is as following", sessionDateId);
        const token = this.socketsWithTokens[socket.id];
        const res = await this.authorizeConnection(token, sessionDateId);
        const user = res?.user;
        if (!user) {
          console.log("unauthorized user");
          socket.disconnect();
          return;
        }
        const rtpCapabilities = await this.joinOrCreateRoom(
          socket,
          sessionDateId
        );
        callback({ rtpCapabilities });
      });

      socket.on("chat-message", (message: string) => {
        // handle chat message
      });

      socket.on("disconnect", () => {
        // handle user disconnection
      });
    } catch (err: any) {
      console.log(err);
    }
  }

  async authorizeConnection(token: string, sessionDateId: string) {
    console.log("entered in the authorizeConnection method");
    if (typeof sessionDateId != "string") return undefined;
    console.log("before calling authorize participant api");
    const user = await authorizationService.authorizeParticipant(
      parseInt(sessionDateId),
      token
    );
    console.log("authorize function has been executed successfully");
    return { user, roomName: sessionDateId };
  }

  async joinOrCreateRoom(socket: Socket, roomName: string) {
    const router1 = await this.sfuClient.createRoom(roomName, socket.id);
    this.sfuClient.peers[socket.id] = {
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
}

export default SocketHandler;
