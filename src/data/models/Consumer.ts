import { Consumer } from "mediasoup/node/lib/Consumer";
import { BaseModel } from "./baseModel";
export interface ConsumerAttributes {
  socketId: string;
  roomName: string;
  consumer: Consumer;
}
export class ConsumerModel extends BaseModel<ConsumerAttributes[]> {
  async removeAndCloseItemOfSocket(
    socketId: string,
    type?: string
  ): Promise<void> {
    super.removeAndCloseItemOfSocket(socketId,"consumer");
  }

  async deleteById(id: any): Promise<void> {
    this.dataSource = this.dataSource.filter(
      (consumerData) => consumerData.consumer.id
    );
  }

  async findOneById(id: any): Promise<any> {
    return this.dataSource.find(
      (consumerData) => consumerData.consumer.id == id
    );
  }
}
