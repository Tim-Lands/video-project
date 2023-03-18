import * as mediasoup from "mediasoup";
import {
  Worker,
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCodecCapability,
} from "mediasoup/node/lib/types";

export class SFUClient {
  public worker?: Worker ;
  public rooms: any[] = [];
  public producers: {
    socketId: string;
    roomName: string;
    producer: Producer;
  }[] = [];
  public consumers: {
    socketId: string;
    roomName: string;
    consumer: Consumer;
  }[] = [];
  public transports: Array<{
    socketId: string;
    roomName: string;
    transport: WebRtcTransport;
    consumer: Consumer;
  }> = [];
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

  removeItemsOfSocket(items: Array<any>, socketId: string, type: string) {
    items.forEach((item) => {
      if (item.socketId === socketId) {
        item[type].close();
      }
    });
    items = items.filter((item) => item.socketId !== socketId);

    return items;
  }

  removeProducersOfSocket(socketId: string) {
    this.producers = this.removeItemsOfSocket(
      this.producers,
      socketId,
      "producer"
    );
  }

  removeConsumersOfSocket(socketId: string) {
    this.consumers = this.removeItemsOfSocket(
      this.consumers,
      socketId,
      "consumer"
    );
  }

  removeTransportsOfSocket(socketId: string) {
    this.consumers = this.removeItemsOfSocket(
      this.transports,
      socketId,
      "transport"
    );
  }

  removeSocketFromRoom(roomName: any, socket_id: string) {
    this.rooms[roomName] = {
      router: this.rooms[roomName].router,
      peers: this.rooms[roomName].peers.filter(
        (socketId: string) => socketId !== socket_id
      ),
    };
  }

  async createRoom(roomName: any, socketId: string) {
    let router1;
    let peers = [];
    if (this.rooms[roomName]) {
      router1 = this.rooms[roomName].router;
      peers = this.rooms[roomName].peers || [];
    } else {
      router1 = await this.worker?.createRouter({
        mediaCodecs: this.mediaCodecs,
      });
    }

    console.log(`Router ID: ${router1.id}`, peers.length);

    this.rooms[roomName] = {
      router: router1,
      peers: [...peers, socketId],
    };

    return router1;
  }
}
