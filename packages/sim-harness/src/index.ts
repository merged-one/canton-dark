import { buildVenueHealthResponse } from "@canton-dark/app-services";
import type { VenueConfigurationDraft } from "@canton-dark/domain-core";
import { describeReplayCommand } from "@canton-dark/testkit";

export type SimulationInput = {
  draft: VenueConfigurationDraft;
  seed: number;
};

export type SimulationResult = {
  eventId: string;
  replayCommand: string;
  seed: number;
  summary: string;
  venueStatus: "healthy" | "rejected";
};

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

export const runBootstrapSimulation = ({ draft, seed }: SimulationInput): SimulationResult => {
  const random = mulberry32(seed);
  const response = buildVenueHealthResponse(draft, () => new Date("2026-04-02T00:00:00.000Z"));
  const eventId = `SIM-${Math.floor(random() * 1_000_000)
    .toString()
    .padStart(6, "0")}`;

  return {
    seed,
    eventId,
    replayCommand: describeReplayCommand(seed),
    summary: `${response.venue.summary.mode}:${response.venue.summary.dealers.join("|")}:${response.venue.status}`,
    venueStatus: response.venue.status
  };
};
