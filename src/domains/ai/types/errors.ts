export class AiFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly statusText: string,
  ) {
    super(message);
    this.name = "AiFetchError";
  }
}

export class AiParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiParseError";
  }
}
