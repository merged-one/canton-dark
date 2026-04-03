export type LogLevel = "debug" | "error" | "info" | "warn";
export type TelemetryScope = "adapter" | "app" | "domain" | "simulation";
export type StructuredLogAttribute = boolean | null | number | string;

export type StructuredLog = {
  attributes?: Readonly<Record<string, StructuredLogAttribute>>;
  correlationId: string;
  level: LogLevel;
  message: string;
  scope: TelemetryScope;
  timestamp: string;
};

export type TelemetryClock = {
  now: () => Date;
};

export type TelemetrySink = {
  record: (entry: StructuredLog) => Promise<void> | void;
};

export type InMemoryTelemetrySink = TelemetrySink & {
  drain: () => StructuredLog[];
  entries: () => StructuredLog[];
};

export type StructuredLogger = {
  child: (scope: TelemetryScope, correlationId?: string) => StructuredLogger;
  log: (
    level: LogLevel,
    message: string,
    attributes?: Readonly<Record<string, StructuredLogAttribute>>
  ) => Promise<StructuredLog>;
};

const clone = <T>(value: T): T => structuredClone(value);

export const createCorrelationId = (prefix: string, sequence: number): string => {
  const normalizedPrefix = prefix.trim() || "corr";

  return `${normalizedPrefix}-${sequence.toString().padStart(6, "0")}`;
};

export const createInMemoryTelemetrySink = (): InMemoryTelemetrySink => {
  let buffer: StructuredLog[] = [];

  return {
    async record(entry) {
      buffer = [...buffer, clone(entry)];
    },
    entries: () => clone(buffer),
    drain: () => {
      const snapshot = clone(buffer);

      buffer = [];

      return snapshot;
    }
  };
};

export const createStructuredLogger = (input: {
  clock: TelemetryClock;
  correlationId: string;
  scope: TelemetryScope;
  sink: TelemetrySink;
}): StructuredLogger => ({
  async log(level, message, attributes) {
    const entry: StructuredLog = {
      level,
      message,
      scope: input.scope,
      correlationId: input.correlationId,
      timestamp: input.clock.now().toISOString(),
      ...(attributes !== undefined ? { attributes } : {})
    };

    await input.sink.record(entry);

    return entry;
  },
  child(scope, correlationId = input.correlationId) {
    return createStructuredLogger({
      clock: input.clock,
      sink: input.sink,
      scope,
      correlationId
    });
  }
});
