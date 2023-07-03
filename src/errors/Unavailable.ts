import { CustomError } from "./CustomError";

export class UnavailableError extends CustomError {
  constructor(message: string = "Unavailable") {
    super({ message, httpCode: 404 });
  }

  toJson(): { [property: string]: any } {
    return { message: this.message };
  }
}
