import { DomainFetchError, DomainParseError } from "../../../shared/types/errors.js";

export class SteamFetchError extends DomainFetchError {
  constructor(message: string, statusCode: number, statusText: string) {
    super("SteamFetchError", message, statusCode, statusText);
  }
}

export class SteamParseError extends DomainParseError {
  constructor(message: string) {
    super("SteamParseError", message);
  }
}
