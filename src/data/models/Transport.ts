import { Consumer } from "mediasoup/node/lib/Consumer";
import { WebRtcTransport } from "mediasoup/node/lib/WebRtcTransport";
import { BaseModel } from "./baseModel";
import { Transport } from "mediasoup/node/lib/Transport";
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
    // console.log(this.dataSource);
    // console.log(this.dataSource[socketId]);
    return this.dataSource.find(
      (transportData) =>
        transportData.socketId == socketId && !transportData.consumer
    );
  }

  async findConsumerTransportById(id: string) {
    return this.dataSource.find(
      (transportData) =>
        transportData.consumer && transportData.transport.id == id
    );
  }

  async findOneById(id: any): Promise<Transport> {
    return this.dataSource.find(
      (transportData) => transportData.transport.id == id
    );
  }

  async deleteById(id: any): Promise<void> {
    this.dataSource = this.dataSource.filter(
      (transportData) => transportData.transport.id == id
    );
  }
}
