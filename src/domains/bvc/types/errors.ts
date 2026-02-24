import { DomainFetchError, DomainParseError } from "../../../shared/types/errors.js";

export class BvcFetchError extends DomainFetchError {
  constructor(message: string, statusCode: number, statusText: string) {
    super("BvcFetchError", message, statusCode, statusText);
  }
}

export class BvcParseError extends DomainParseError {
  constructor(message: string) {
    super("BvcParseError", message);
  }
}
