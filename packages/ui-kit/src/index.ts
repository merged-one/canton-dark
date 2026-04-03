import type { VenueStatus } from "@canton-dark/query-models";

export const joinList = (values: readonly string[]): string =>
  values.length === 0 ? "none" : values.join(", ");

export const statusToneClass = (status: VenueStatus): "tone-alert" | "tone-ok" =>
  status === "healthy" ? "tone-ok" : "tone-alert";
