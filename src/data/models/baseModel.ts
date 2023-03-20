export class BaseModel<t extends any> {
  dataSource: any[] = [];
  async create(data: any) {
    this.dataSource[data.socketId] = data;
  }

  async deleteById(id: any) {
    this.dataSource.filter((data) => data.id != id);
  }

  async findOneById(id: any): Promise<any> {
    this.dataSource.find((data) => data.id == id);
  }

  async removeAndCloseItemOfSocket(socketId: string, type: string = "") {
    this.dataSource.forEach((item) => {
      if (item.socketId === socketId) {
        item[type].close();
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
