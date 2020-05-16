import { Express, RequestHandler } from "express";
import onFinished = require("on-finished");
import { Histogram, Registry } from "prom-client";

export class ExpressMetricsBundle {

  public get requestHandler(): RequestHandler {
    return (req, res) => {
      res.contentType("text/plain").send(this.registry.metrics());
    };
  }

  public static instrument(
    app: Express,
    registry: Registry,
    metricsPrefix = "http_"
  ): ExpressMetricsBundle {
    const bundle = new ExpressMetricsBundle(app, registry, metricsPrefix);

    bundle.registerDurationHistogram();

    return bundle;
  }
  private readonly app: Express;
  private readonly registry: Registry;
  private readonly metricsPrefix: string;

  constructor(app: Express, registry: Registry, metricsPrefix = "http_") {
    this.app = app;
    this.registry = registry;
    this.metricsPrefix = metricsPrefix;
  }

  private registerDurationHistogram(): void {
    const histogram = new Histogram({
      name: this.metricsPrefix + "request_duration_seconds",
      help: "request duration in seconds",
      labelNames: ["status_code"],
      buckets: [0.5, 0.75, 0.95, 0.98, 0.99, 0.999],
      registers: [this.registry]
    });

    this.app.use((req, res, next) => {
      const timer = histogram.startTimer();

      onFinished(res, () => {
        // eslint-disable-next-line @typescript-eslint/camelcase
        timer({ status_code: String(res.statusCode) });
      });

      next();
    });
  }
}
