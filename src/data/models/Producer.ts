import { Producer } from "mediasoup/node/lib/Producer";
import { BaseModel } from "./baseModel";
export interface ProducerAttributes {
  socketId: string;
  roomName: string;
  producer: Producer;
}
export class ProducerModel extends BaseModel<ProducerAttributes[]> {
  async removeAndCloseItemOfSocket(socketId: string, type?: string): Promise<void> {
    super.removeAndCloseItemOfSocket("producer");
  }
}
