import { DomainFetchError, DomainParseError } from "../../../shared/types/errors.js";

export class AiFetchError extends DomainFetchError {
  constructor(message: string, statusCode: number, statusText: string) {
    super("AiFetchError", message, statusCode, statusText);
  }
}

export class AiParseError extends DomainParseError {
  constructor(message: string) {
    super("AiParseError", message);
  }
}
