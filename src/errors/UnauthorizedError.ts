import { CustomError } from "./CustomError";

export class UnauthorizedError extends CustomError {
  constructor(message: string = "Unauthorized") {
    super({ message, httpCode: 403 });
  }

  toJson(): { [property: string]: any } {
    return { message: this.message };
  }
}
