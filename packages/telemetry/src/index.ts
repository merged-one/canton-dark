export type TelemetryEvent = {
  level: "error" | "info" | "warn";
  message: string;
  scope: "adapter" | "app" | "domain" | "simulation";
};
