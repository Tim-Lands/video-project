import { BaseModel } from "./baseModel";

export class RoomModel {
  async removeAndCloseItemOfSocket(
    socketId: string,
    type?: string
  ): Promise<void> {
    throw new Error("Unimplemented method");
  }
  public dataSource: any = {};

  async removePeerFromRoom(socket_id: string, roomName: any) {
    this.dataSource[roomName] = {
      router: this.dataSource[roomName].router,
      peers: this.dataSource[roomName].peers.filter(
        (socketId: string) => socketId !== socket_id
      ),
    };
  }

  async findOneByRoomName(roomName: any) {
    return this.dataSource[roomName];
  }

  async updateOneByRoomName(roomName: any, room: any) {
    this.dataSource[roomName] = room;
  }
}
