import { Consumer } from "mediasoup/node/lib/Consumer";
import { WebRtcTransport } from "mediasoup/node/lib/WebRtcTransport";
import { BaseModel } from "./baseModel";
export interface TransportAttributes {
  socketId: string;
  roomName: string;
  transport: WebRtcTransport;
  consumer: Consumer;
}
export class TransportModel extends BaseModel<any[]> {
  async removeAndCloseItemOfSocket(
    socketId: string,
    type?: string
  ): Promise<void> {
    super.removeAndCloseItemOfSocket("transport");
  }

  async findBySocketIdWhereNotConsumer(socketId: string) {
    return this.dataSource.find(
      (transport) => transport.socketId === socketId && !transport.consumer
    );
  }
}
