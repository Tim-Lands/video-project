import { CustomError } from "./CustomError";
import { NotFoundError } from "./NotFoundError";
import { UnauthorizedError } from "./UnauthorizedError";
import { UnexpectedError } from "./UnexpectedError";

const getError = (err: any): CustomError => {
  switch (err.httpCode) {
    case 404:
      return new NotFoundError();
      break;
    case 403:
      return new UnauthorizedError();
      break;
    default:
      return new UnexpectedError();
      break;
  }
};
