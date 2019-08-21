import * as debugLogger from "debug-logger";
import { EventEmitter } from "eventemitter3";
import { promises as fs } from "fs";
import { createServer, RequestListener, Server } from "http";
import { BaseError } from "make-error-cause";
import { AddressInfo, ListenOptions } from "net";

const log = debugLogger("recent-messages:api:server");

export interface HttpServerEvents {
  error: [Error];
  listening: [];
}

interface SystemError {
  name: string;
  message: string;
  code: string;
  syscall: string;
}

function isSystemError(error: Error): error is SystemError {
  return "code" in error && "syscall" in error;
}

export class HttpServer extends EventEmitter<HttpServerEvents> {
  public readonly server: Server;
  public readonly app: RequestListener;
  private readonly listenOptions: ListenOptions;

  public constructor(app: RequestListener, listenOptions: ListenOptions) {
    super();
    this.app = app;
    this.listenOptions = listenOptions;

    this.on("error", this.onError);
    this.on("listening", this.onListening);

    this.server = createServer(this.app);
  }

  public async start(): Promise<Server> {
    const socketPath = this.listenOptions.path;
    if (socketPath != null) {
      try {
        await fs.unlink(socketPath);
        log.debug(
          "OK: Old socket file from %s successfully deleted.",
          socketPath
        );
      } catch (e) {
        if (!("code" in e && e.code === "ENOENT")) {
          throw new BaseError("Error deleting socket file at " + socketPath, e);
        }
        log.debug("OK: No socket file at %s to delete.", socketPath);
      }
    }

    this.server.on("error", e => this.emit("error", e));
    this.server.on("listening", () => this.emit("listening"));

    await new Promise((resolve, reject) => {
      this.server.listen(this.listenOptions, resolve);
      this.server.on("error", reject);
    });

    return this.server;
  }

  public describeConnection(): string {
    // https://nodejs.org/api/net.html#net_server_address
    const addr: AddressInfo | string | null = this.server.address();
    if (typeof addr === "string") {
      return `socket ${addr}`;
    }

    if (typeof addr === "object" && addr != null) {
      return `${addr.address}:${addr.port}`;
    }

    return "unknown";
  }

  private onError(error: Error): void {
    if (isSystemError(error) && error.syscall === "listen") {
      // handle specific listen errors with friendly messages
      switch (error.code) {
        case "EACCES":
          log.error(
            `Listening on ${this.describeConnection()} requires elevated privileges`
          );
          break;
        case "EADDRINUSE":
          log.error(`${this.describeConnection()} is already in use`);
          break;
      }
    }
    log.error(error);
  }

  private onListening(): void {
    log.info(`Listening on ${this.describeConnection()}`);
  }
}
