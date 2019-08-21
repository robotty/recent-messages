import { ChatClient, ClientState } from "dank-twitch-irc";
import { Counter, Gauge, Registry } from "prom-client";

export class ChatClientMetricsBundle {
  private readonly chatClient: ChatClient;
  private readonly registry: Registry;
  private readonly metricsPrefix: string;

  public constructor(
    chatClient: ChatClient,
    registry: Registry,
    metricsPrefix = "twitch_irc_"
  ) {
    this.chatClient = chatClient;
    this.registry = registry;
    this.metricsPrefix = metricsPrefix;
  }

  public static instrument(
    chatClient: ChatClient,
    registry: Registry,
    metricsPrefix = "twitch_irc_"
  ): void {
    const bundle = new ChatClientMetricsBundle(
      chatClient,
      registry,
      metricsPrefix
    );

    bundle.initializeMessageCounter();
    bundle.initializeChannelsGauge();
    bundle.initializeConnectionsStats();
    bundle.initializeReconnectCounter();
  }

  private initializeMessageCounter(): void {
    const counter = new Counter({
      name: this.metricsPrefix + "messages_received",
      help: "Incoming message count (all messages)",
      registers: [this.registry],
      labelNames: ["command"]
    });

    this.chatClient.on("message", msg => {
      counter.inc({ command: msg.ircCommand });
    });
  }

  private initializeChannelsGauge(): void {
    const gauge = new Gauge({
      name: this.metricsPrefix + "channels",
      help: "Joined/wanted channels",
      registers: [this.registry],
      labelNames: ["type"]
    });

    const update = (): void => {
      gauge.set({ type: "wanted" }, this.chatClient.wantedChannels.size);
      gauge.set({ type: "joined" }, this.chatClient.joinedChannels.size);
    };

    update();
    setInterval(update, 10 * 1000);
  }

  private initializeConnectionsStats(): void {
    const gauge = new Gauge({
      name: this.metricsPrefix + "connections",
      help: "Connections in the connections pool",
      registers: [this.registry],
      labelNames: ["type"]
    });

    const update = (): void => {
      gauge.reset();
      for (const connection of this.chatClient.connections) {
        const state = connection.state;
        const stateName = ClientState[state].toLowerCase();

        gauge.inc({ type: stateName });
      }
    };

    update();
    setInterval(update, 10 * 1000);
  }

  private initializeReconnectCounter(): void {
    const counter = new Counter({
      name: this.metricsPrefix + "reconnects",
      help: "Reconnections",
      registers: [this.registry]
    });

    this.chatClient.on("reconnect", () => counter.inc());
  }
}
