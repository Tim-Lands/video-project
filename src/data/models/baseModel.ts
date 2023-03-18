export class BaseModel<t> {
  dataSource: any[];
  async create(data: t) {
    this.dataSource.push(data);
  }

  async deleteById(id: any) {
    this.dataSource.filter((data) => data.id != id);
  }

  async findOne(id: any) {
    this.dataSource.find((data) => data.id == id);
  }
}
