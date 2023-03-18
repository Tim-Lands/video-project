/* Please follow mediasoup installation requirements */
/* https://mediasoup.org/documentation/v3/mediasoup/installation/ */
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

// SSL cert for HTTPS access
/* const options = {
	key: fs.readFileSync('./server/ssl/key.pem', 'utf-8'),
	cert: fs.readFileSync('./server/ssl/cert.pem', 'utf-8')
} */
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
  let peers: any = {}; // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
  // [ { socketId1, roomName1, transport, consumer }, ... ]
  // [ { socketId1, roomName1, producer, }, ... ]
  // [ { socketId1, roomName1, consumer, }, ... ]

  // We create a Worker as soon as our application starts

  // This is an Array of RtpCapabilities
  // https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpCodecCapability
  // list of media codecs supported by mediasoup ...
  // https://github.com/versatica/mediasoup/blob/v3/src/supportedRtpCapabilities.ts

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

      const { roomName } = peers[socket.id];
      delete peers[socket.id];

      // remove socket from room
      sfuClient.removeSocketFromRoom(roomName, socket.id);
    });

    socket.on("joinRoom", async ({ roomName }, callback) => {
      // create Router if it does not exist
      // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
      const { current_user } = socket.data;
      console.log("current_user is, ", current_user);
      // const is_member_of_session = await isMemberOfSession(roomName, current_user.id)
      /* if (!is_member_of_session){
			return socket.send('error', new Error("unauthorized"))
		
		} */
      const router1 = await sfuClient.createRoom(roomName, socket.id);

      peers[socket.id] = {
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

   

    // socket.on('createRoom', async (callback) => {
    //   if (router === undefined) {
    //     // worker.createRouter(options)
    //     // options = { mediaCodecs, appData }
    //     // mediaCodecs -> defined above
    //     // appData -> custom application data - we are not supplying any
    //     // none of the two are required
    //     router = await worker.createRouter({ mediaCodecs, })
    //     console.log(`Router ID: ${router.id}`)
    //   }

    //   getRtpCapabilities(callback)
    // })

    // const getRtpCapabilities = (callback) => {
    //   const rtpCapabilities = router.rtpCapabilities

    //   callback({ rtpCapabilities })
    // }

    // Client emits a request to create server side Transport
    // We need to differentiate between the producer and consumer transports
    socket.on("createWebRtcTransport", async ({ consumer }, callback) => {
      // get Room Name from Peer's properties
      const roomName = peers[socket.id].roomName;

      // get Router (Room) object this peer is in based on RoomName
      const router = sfuClient.rooms[roomName].router;

      createWebRtcTransport(router).then(
        (transport) => {
          callback({
            params: {
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
            },
          });

          // add transport to Peer's properties
          addTransport(transport, roomName, consumer);
        },
        (error) => {
          console.log(error);
        }
      );
    });

    const addTransport = (
      transport: WebRtcTransport,
      roomName: string,
      consumer: Consumer
    ) => {
      sfuClient.transports = [
        ...sfuClient.transports,
        { socketId: socket.id, transport, roomName, consumer },
      ];

      peers[socket.id] = {
        ...peers[socket.id],
        transports: [...peers[socket.id].transports, transport.id],
      };
    };

    const addProducer = (producer: Producer, roomName: string) => {
      sfuClient.producers = [
        ...sfuClient.producers,
        { socketId: socket.id, producer, roomName },
      ];

      peers[socket.id] = {
        ...peers[socket.id],
        producers: [...peers[socket.id].producers, producer.id],
      };
    };

    const addConsumer = (consumer: Consumer, roomName: string) => {
      // add the consumer to the consumers list
      sfuClient.consumers = [
        ...sfuClient.consumers,
        { socketId: socket.id, consumer, roomName },
      ];

      // add the consumer id to the peers list
      peers[socket.id] = {
        ...peers[socket.id],
        consumers: [...peers[socket.id].consumers, consumer.id],
      };
    };

    socket.on("getProducers", (callback) => {
      //return all producer transports
      const { roomName } = peers[socket.id];

      let producerList: string[] = [];
      sfuClient.producers.forEach((producerData) => {
        if (
          producerData.socketId !== socket.id &&
          producerData.roomName === roomName
        ) {
          producerList = [...producerList, producerData.producer.id];
        }
      });

      // return the producer list back to the client
      callback(producerList);
    });

    const informConsumers = (
      roomName: string,
      socketId: string,
      id: string
    ) => {
      console.log(`just joined, id ${id} ${roomName}, ${socketId}`);
      // A new producer just joined
      // let all consumers to consume this producer
      sfuClient.producers.forEach((producerData) => {
        if (
          producerData.socketId !== socketId &&
          producerData.roomName === roomName
        ) {
          const producerSocket = peers[producerData.socketId].socket;
          // use socket to send producer id to producer
          producerSocket.emit("new-producer", { producerId: id });
        }
      });
    };

    const getTransport = (socketId: string) => {
      const [producerTransport] = sfuClient.transports.filter(
        (transport) => transport.socketId === socketId && !transport.consumer
      );
      return producerTransport.transport;
    };

    // see client's socket.emit('transport-connect', ...)
    socket.on("transport-connect", ({ dtlsParameters }) => {
      console.log("DTLS PARAMS... ", { dtlsParameters });

      getTransport(socket.id).connect({ dtlsParameters });
    });

    // see client's socket.emit('transport-produce', ...)
    socket.on(
      "transport-produce",
      async ({ kind, rtpParameters, appData }, callback) => {
        // call produce based on the prameters from the client
        const producer = await getTransport(socket.id).produce({
          kind,
          rtpParameters,
        });

        // add producer to the producers array
        const { roomName } = peers[socket.id];

        addProducer(producer, roomName);

        informConsumers(roomName, socket.id, producer.id);

        console.log("Producer ID: ", producer.id, producer.kind);

        producer.on("transportclose", () => {
          console.log("transport for this producer closed ");
          producer.close();
        });

        // Send back to the client the Producer's id
        callback({
          id: producer.id,
          producersExist: sfuClient.producers.length > 1 ? true : false,
        });
      }
    );

    // see client's socket.emit('transport-recv-connect', ...)
    socket.on(
      "transport-recv-connect",
      async ({ dtlsParameters, serverConsumerTransportId }) => {
        console.log(`DTLS PARAMS: ${dtlsParameters}`);
        const consumerTransport = sfuClient.transports.find(
          (transportData) =>
            transportData.consumer &&
            transportData.transport.id == serverConsumerTransportId
        )?.transport;
        if (consumerTransport)
          await consumerTransport.connect({ dtlsParameters });
      }
    );

    socket.on(
      "consume",
      async (
        { rtpCapabilities, remoteProducerId, serverConsumerTransportId },
        callback
      ) => {
        try {
          const { roomName } = peers[socket.id];
          const router = sfuClient.rooms[roomName].router;
          let consumerTransport = sfuClient.transports.find(
            (transportData) =>
              transportData.consumer &&
              transportData.transport.id == serverConsumerTransportId
          )?.transport;
          if (!consumerTransport) return;

          // check if the router can consume the specified producer
          if (
            router.canConsume({
              producerId: remoteProducerId,
              rtpCapabilities,
            })
          ) {
            // transport can now consume and return a consumer
            const consumer = await consumerTransport.consume({
              producerId: remoteProducerId,
              rtpCapabilities,
              paused: true,
            });

            consumer.on("transportclose", () => {
              console.log("transport close from consumer");
            });

            consumer.on("producerclose", () => {
              console.log("producer of consumer closed");
              socket.emit("producer-closed", { remoteProducerId });

              consumerTransport?.close();
              sfuClient.transports = sfuClient.transports.filter(
                (transportData) =>
                  transportData.transport.id !== consumerTransport?.id
              );
              consumer.close();
              sfuClient.consumers = sfuClient.consumers.filter(
                (consumerData) => consumerData.consumer.id !== consumer.id
              );
            });

            addConsumer(consumer, roomName);

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
            callback({ params });
          }
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
      console.log("consumer resume");
      const consumer: any = sfuClient.consumers.find(
        (consumerData) => consumerData.consumer.id === serverConsumerId
      );
      await consumer.consumer.resume();
    });
  });

  const createWebRtcTransport = async (router: Router) => {
    return new Promise<WebRtcTransport>(async (resolve, reject) => {
      try {
        // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
        const webRtcTransport_options = {
          listenIps: [
            {
              ip: "0.0.0.0", // replace with relevant IP address
              announcedIp: "172.22.48.1",
            },
          ],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
        };

        // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
        let transport: WebRtcTransport = await router.createWebRtcTransport(
          webRtcTransport_options
        );
        console.log(`transport id: ${transport.id}`);

        transport.on("dtlsstatechange", (dtlsState: any) => {
          if (dtlsState === "closed") {
            transport.close();
          }
        });

        transport.on("@close", () => {
          console.log("transport closed");
        });

        resolve(transport);
      } catch (error) {
        reject(error);
      }
    });
  };
});

server.listen(5000, () => console.log(`Server is running on port ${5000}`));
