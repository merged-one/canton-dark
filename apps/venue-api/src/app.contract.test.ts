import { describe, expect, it } from "vitest";

import {
  parseDarkSubscriberStateResponse,
  parseDemoStatusResponse,
  parseHealthResponse,
  parseOperatorOversightView
} from "@canton-dark/api-contracts";

import { createVenueApiApp } from "./app";

describe("venue-api contract compatibility", () => {
  it("serves phase 3 demo and dark subscriber payloads that satisfy published contracts", async () => {
    const api = await createVenueApiApp({
      bootstrapMode: "phase3-ready",
      seed: 424242,
      startAt: "2026-04-02T00:00:00.000Z"
    });

    const demoStatus = await api.handleRequest({
      method: "GET",
      url: "/demo/status"
    });
    const parsedStatus = parseDemoStatusResponse(demoStatus.body);

    expect(parsedStatus.mode).toBe("phase3-ready");
    expect(parsedStatus.proposalId).toContain("match-proposal-");

    const health = await api.handleRequest({
      method: "GET",
      url: `/health?pairId=${encodeURIComponent(parsedStatus.pairId)}`
    });
    const parsedHealth = parseHealthResponse(health.body);

    expect(parsedHealth.venue.summary.pairId).toBe(parsedStatus.pairId);

    const darkSubscriber = await api.handleRequest({
      method: "GET",
      url: `/pairs/${parsedStatus.pairId}/views/dark-subscriber?subscriberId=${parsedStatus.subscriberId}`,
      headers: {
        "x-actor-id": parsedStatus.subscriberId
      }
    });
    const parsedDarkState = parseDarkSubscriberStateResponse(darkSubscriber.body);

    expect(parsedDarkState.subscriberId).toBe(parsedStatus.subscriberId);
    expect(parsedDarkState.proposals[0]?.proposalId).toBe(parsedStatus.proposalId);
  });

  it("serves phase 2 oversight payloads that satisfy published contracts", async () => {
    const api = await createVenueApiApp({
      bootstrapMode: "phase2-ready",
      seed: 42,
      startAt: "2026-04-02T00:00:00.000Z"
    });

    const demoStatus = parseDemoStatusResponse(
      (
        await api.handleRequest({
          method: "GET",
          url: "/demo/status"
        })
      ).body
    );

    const oversight = await api.handleRequest({
      method: "GET",
      url: `/pairs/${demoStatus.pairId}/views/operator-oversight`,
      headers: {
        "x-actor-id": demoStatus.operatorId
      }
    });
    const parsedOversight = parseOperatorOversightView(oversight.body);

    expect(parsedOversight.pair.pairId).toBe(demoStatus.pairId);
    expect(parsedOversight.pair.mode).toBe("ATSPair");
  });
});
