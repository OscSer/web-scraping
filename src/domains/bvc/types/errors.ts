export class BvcFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly statusText: string,
  ) {
    super(message);
    this.name = "BvcFetchError";
  }
}

export class BvcParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BvcParseError";
  }
}
