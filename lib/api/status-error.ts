import { BaseError } from "make-error-cause";

export class StatusCodeError extends BaseError {
  public readonly statusCode: number;

  public constructor(
    statusCode: number,
    message: string,
    cause?: Error | undefined
  ) {
    super(message, cause);
    this.statusCode = statusCode;
  }
}
