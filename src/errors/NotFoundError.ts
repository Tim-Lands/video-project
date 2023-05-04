import { CustomError } from "./CustomError";

export class NotFoundError extends CustomError {
  constructor() {
    super({ message: "Element not found", httpCode: 404 });
  }

  toJson(): { [property: string]: any } {
    return { message: this.message };
  }
}
