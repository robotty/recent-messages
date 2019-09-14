import * as debugLogger from "debug-logger";
import {
  ErrorRequestHandler,
  Express,
  NextFunction,
  Request,
  Response
} from "express";
import { STATUS_CODES as statusCodes } from "http";
import { StatusCodeError } from "./status-error";

const log = debugLogger("recent-messages:app");

export function registerDefaultErrorHandler(app: Express): void {
  const errorHandler: ErrorRequestHandler = (
    err: Error,
    req: Request,
    res: Response,
    // express inspects function argument length, we cannot omit
    // "next" or this will not be added as an error handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
  ): void => {
    let statusToSend: number;
    let canSendMessage: boolean;
    if (err instanceof StatusCodeError) {
      statusToSend = err.statusCode;
      canSendMessage = true;
    } else {
      statusToSend = 500;
      canSendMessage = false;
    }

    if (statusToSend > 500 && statusToSend < 600) {
      log.warn("Error in request handler", err);
    }

    const json = {
      status: statusToSend,
      statusMessage: statusCodes[statusToSend],
      error: canSendMessage ? err.message : statusCodes[statusToSend]
    };

    res.status(statusToSend).json(json);
  };
  app.use(errorHandler);
}
