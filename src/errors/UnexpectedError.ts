import { CustomError } from "./CustomError";

export class UnexpectedError extends CustomError {
  constructor() {
    super({ message: "Unexpected error", httpCode: 500 });
  }

  toJson(): { [property: string]: any } {
    return { message: this.message };
  }
}
