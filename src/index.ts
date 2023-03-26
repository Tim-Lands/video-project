import express from "express";
import fs from "fs";
import path from "path";
import { Server } from "socket.io";
import * as mediasoup from "mediasoup";
import {
  Worker,
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCodecCapability,
} from "mediasoup/node/lib/types";
import { authorizeToken } from "./API/AuthService";
import { SFUClient } from "./services/sfuClient";
// const { isOwnerOfSession, isMemberOfSession } = require('./services/ProductService')

const httpServer = require("http");
const app = express();
const dirname = path.resolve();
const server = httpServer.createServer(app);

app.get("*", (req: any, res: any, next: any) => {
  const path = "/sfu/";

  if (req.path.indexOf(path) == 0 && req.path.length > path.length)
    return next();

  res.send(
    `You need to specify a room name in the path e.g. 'https://127.0.0.1/sfu/room'`
  );
});

app.use("/sfu/:room", express.static(path.join(dirname, "public")));

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
    socket.emit("connection-success", {
      socketId: socket.id,
    });

    socket.on("disconnect", () => {
      // do some cleanup
      console.log("peer disconnected");
      sfuClient.removeConsumersOfSocket(socket.id);
      sfuClient.removeProducersOfSocket(socket.id);
      sfuClient.removeTransportsOfSocket(socket.id);

      const { roomName } = sfuClient.peers[socket.id];
      delete sfuClient.peers[socket.id];

      // remove socket from room
      sfuClient.removeSocketFromRoom(roomName, socket.id);
    });

    socket.on("joinRoom", async ({ roomName }, callback) => {
      // create Router if it does not exist
      // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
      const { current_user } = socket.data;
      // const is_member_of_session = await isMemberOfSession(roomName, current_user.id)
      /* if (!is_member_of_session){
			return socket.send('error', new Error("unauthorized"))
		
		} */
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
      callback({ rtpCapabilities });
    });

    socket.on("createWebRtcTransport", async ({ consumer }, callback) => {
      const transport = await sfuClient.createWebRtcTransport(
        socket.id,
        consumer
      );
      callback({
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });
    });

    socket.on("getProducers", async (callback) => {
      //return all producer transports
      const producers = await sfuClient.getProducersListForSocket(socket.id);
      // return the producer list back to the client
      callback(producers.map((producer) => producer.id));
    });

    // see client's socket.emit('transport-connect', ...)
    socket.on("transport-connect", async ({ dtlsParameters }) => {
      const transportData = await sfuClient.getTransport(socket.id);
      const transport = transportData.transport;
      transport.connect({ dtlsParameters });
    });

    // see client's socket.emit('transport-produce', ...)
    socket.on(
      "transport-produce",
      async ({ kind, rtpParameters, appData }, callback) => {
        // call produce based on the prameters from the client
        const producer_id = await sfuClient.transportProduce(
          socket.id,
          kind,
          rtpParameters
        );
        const producersCount = await sfuClient.getProducersCount();
        // Send back to the client the Producer's id
        callback({
          id: producer_id,
          producersExist: producersCount > 1 ? true : false,
        });
      }
    );

    // see client's socket.emit('transport-recv-connect', ...)
    socket.on(
      "transport-recv-connect",
      async ({ dtlsParameters, serverConsumerTransportId }) => {
        sfuClient.connectConsumerTransport(
          dtlsParameters,
          serverConsumerTransportId
        );
      }
    );

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
      await sfuClient.pauseProducerBySocketId(socket.id);
    });

    socket.on(
      "consume", 
      async (
        { rtpCapabilities, remoteProducerId, serverConsumerTransportId },
        callback
      ) => {
        try {
          const consumerData = await sfuClient.consume(
            socket.id,
            serverConsumerTransportId,
            rtpCapabilities,
            remoteProducerId
          );
          if (!consumerData) {
            console.log(
              "************************ cannot coonsume **************************"
            );
            return;
          }
          const { consumer, consumerTransport } = consumerData;
          consumer.on("transportclose", () => {
            console.log("transport close from consumer");
          });

          consumer.on("producerclose", () => {
            console.log("producer of consumer closed");
            socket.emit("producer-closed", { remoteProducerId });
            consumerTransport.close();
            sfuClient.removeTransport(consumerTransport?.id);
            consumer.close();
            sfuClient.removeConsumer(consumer.id);
          });

          // from the consumer extract the following params
          // to send back to the Client
          const params = {
            id: consumer.id,
            producerId: remoteProducerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            serverConsumerId: consumer.id,
          };
          // send the parameters to the client
          console.log("before calling consumer callback");
          callback({ params });
        } catch (error: any) {
          console.log(error.message);
          callback({
            params: {
              error: error,
            },
          });
        }
      }
    );

    socket.on("consumer-resume", async ({ serverConsumerId }) => {
      await sfuClient.resumeConsume(serverConsumerId);
    });
  });
});

server.listen(5000, () => console.log(`Server is running on port ${5000}`));
