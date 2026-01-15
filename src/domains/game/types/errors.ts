export class SteamFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly statusText: string
  ) {
    super(message);
    this.name = "SteamFetchError";
  }
}

export class SteamParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SteamParseError";
  }
}
