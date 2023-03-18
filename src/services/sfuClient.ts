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

  removeProducersOfSocket(socketId: string) {
    this.producerModel.removeAndCloseItemOfSocket(socketId);
  }

  removeConsumersOfSocket(socketId: string) {
    this.consumerModel.removeAndCloseItemOfSocket(socketId);
  }

  removeTransportsOfSocket(socketId: string) {
    this.transportModel.removeAndCloseItemOfSocket(socketId);
  }

  removeSocketFromRoom(roomName: any, socket_id: string) {
    this.roomModel.removePeerFromRoom(socket_id, roomName);
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
