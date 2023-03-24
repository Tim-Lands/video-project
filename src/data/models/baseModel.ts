export class BaseModel<t extends any> {
  dataSource: any[] = [];
  async create(data: any) {
    this.dataSource.push(data);
  }

  async deleteById(id: any) {
    this.dataSource.filter((data) => data.id != id);
  }

  async findOneById(id: any): Promise<any> {
    this.dataSource.find((data) => data.id == id);
  }

  async removeAndCloseItemOfSocket(socketId: string, type: string = "") {
    this.dataSource.forEach((item) => {
      console.log("iterating", item.socketId, "  ", socketId);
      if (item.socketId === socketId) {
        item[type].close();
        console.log("item of socket is closed");
      }
    });
    this.dataSource = this.dataSource.filter(
      (item) => item.socketId !== socketId
    );
  }

  async findAll() {
    return this.dataSource;
  }
}
