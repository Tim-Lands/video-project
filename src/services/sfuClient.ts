import * as mediasoup from "mediasoup";
import {
  Worker,
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCodecCapability,
} from "mediasoup/node/lib/types";
import { ConsumerModel } from "../data/models/Consumer";
import { ProducerModel } from "../data/models/Producer";
import { TransportModel } from "../data/models/Transport";
import { RoomModel } from "../data/models/Room";
export class SFUClient {
  public worker?: Worker;
  public peers: any = {};
  public roomModel: RoomModel = new RoomModel();
  consumerModel: ConsumerModel = new ConsumerModel();
  producerModel: ProducerModel = new ProducerModel();
  transportModel: TransportModel = new TransportModel();
  public mediaCodecs: Array<RtpCodecCapability>;

  constructor() {
    this.mediaCodecs = [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
          "x-google-start-bitrate": 1000,
        },
      },
    ];
  }

  async createAndGetWorker(): Promise<Worker> {
    const worker = await mediasoup.createWorker({
      rtcMinPort: 2000,
      rtcMaxPort: 2020,
    });
    console.log(`worker pid ${worker.pid}`);

    worker.on("died", (error: any) => {
      // This implies something serious happened, so kill the application
      console.error("mediasoup worker has died");
      setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
    });
    this.worker = worker;
    return worker;
  }

  async removeProducersOfSocket(socketId: string) {
    this.producerModel.removeAndCloseItemOfSocket(socketId);
  }

  async removeConsumersOfSocket(socketId: string) {
    this.consumerModel.removeAndCloseItemOfSocket(socketId);
  }

  async removeTransportsOfSocket(socketId: string) {
    this.transportModel.removeAndCloseItemOfSocket(socketId);
  }

  async removeSocketFromRoom(roomName: any, socket_id: string) {
    this.roomModel.removePeerFromRoom(socket_id, roomName);
  }

  async getProducersCount() {
    return this.producerModel.count();
  }

  async transportProduce(socketId: string, kind: any, rtpParameters: any) {
    const transporter =
      await this.transportModel.findBySocketIdWhereNotConsumer(socketId);

    const producer = await transporter.produce({ kind, rtpParameters });
    // add producer to the producers array
    const { roomName } = this.peers[socketId];

    await this.producerModel.create({ socketId, producer, roomName });
    this.peers[socketId] = {
      ...this.peers[socketId],
      producers: [...this.peers[socketId].producers, producer.id],
    };
    this.informConsumers(roomName, socketId, producer.id);

    console.log("Producer ID: ", producer.id, producer.kind);

    producer.on("transportclose", () => {
      console.log("transport for this producer closed ");
      producer.close();
    });
    return producer.id;
  }

  async informConsumers(roomName: string, socketId: string, id: string) {
    console.log(`just joined, id ${id} ${roomName}, ${socketId}`);
    // A new producer just joined
    // let all consumers to consume this producer
    const producersInRoom =
      await this.producerModel.findAllProducersInRoomByRoomname(roomName);
    producersInRoom
      .filter((producer: any) => producer.socketId != socketId)
      .map((producer) => this.peers[producer.socketId].socket)
      .forEach((producerSocket) =>
        producerSocket.emit("nwe-producer", { producerId: id })
      );
  }

  async createRoom(roomName: any, socketId: string) {
    let router1;
    let peers = [];
    let room = await this.roomModel.findOneByRoomName(roomName);
    if (room) {
      router1 = room.router;
      peers = room.peers || [];
    } else {
      router1 = await this.worker?.createRouter({
        mediaCodecs: this.mediaCodecs,
      });
    }
    room = { router: router1, peers: [...peers, socketId] };
    this.roomModel.updateOneByRoomName(roomName, room);
    return router1;
  }

  async createWebRtcTransport(socketId: any, consumer: any) {
    const roomName = this.peers[socketId].roomName;
    const room = await this.roomModel.findOneByRoomName(roomName);
    const router = room.router;
    // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
    const webRtcTransport_options = {
      listenIps: [
        {
          ip: "0.0.0.0", // replace with relevant IP address
          announcedIp: "192.168.1.3",
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

    this.transportModel.create({
      transport,
      socketId,
      roomName,
      consumer,
    });

    return transport;
  }
}
