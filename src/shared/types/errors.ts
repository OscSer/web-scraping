export class DomainFetchError extends Error {
  public readonly statusCode: number;
  public readonly statusText: string;

  constructor(name: string, message: string, statusCode: number, statusText: string) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    this.statusText = statusText;
  }
}

export class DomainParseError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}
