type ErrorArgs = {
    name?: string;
    httpCode: number;
    message: string;
  };
  
  export abstract class CustomError extends Error {
    public readonly name: string;
    public readonly httpCode: number;
    constructor(args: ErrorArgs) {
      super(args.message);
      this.name = args.name || "Error";
      this.httpCode = args.httpCode;
    }
    abstract toJson(): { [property: string]: any };
  }
  