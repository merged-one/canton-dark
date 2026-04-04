import { expect, test } from "@playwright/test";

import { parseDarkSubscriberStateResponse } from "@canton-dark/api-contracts";

import { resetDemo, urls } from "./helpers/phase1";

test("@phase3 @smoke seeded dark-cross demo exposes proposal state and preserves scope", async ({
  page,
  request
}) => {
  const status = await resetDemo(request, "phase3-ready");

  await page.goto(urls.demo);
  await expect(page.getByTestId("demo-state-card")).toContainText(status.pairId);
  await expect(page.getByTestId("demo-state-card")).toContainText(status.proposalId ?? "");
  await expect(page.getByTestId("demo-roster-card")).toContainText(
    status.secondarySubscriberId ?? ""
  );

  const primaryResponse = await request.get(
    `${urls.api}/pairs/${status.pairId}/views/dark-subscriber?subscriberId=${status.subscriberId}`,
    {
      headers: {
        "x-actor-id": status.subscriberId
      }
    }
  );

  expect(primaryResponse.ok()).toBeTruthy();

  const primaryView = parseDarkSubscriberStateResponse(await primaryResponse.json());
  expect(primaryView.proposals[0]?.proposalId).toBe(status.proposalId);
  expect(primaryView.orders).toHaveLength(1);
  expect(
    primaryView.locks.some(
      (lock) => lock.proposalId === status.proposalId && lock.subscriberId === status.subscriberId
    )
  ).toBe(true);

  const counterpartyResponse = await request.get(
    `${urls.api}/pairs/${status.pairId}/views/dark-subscriber?subscriberId=${status.secondarySubscriberId}`,
    {
      headers: {
        "x-actor-id": status.secondarySubscriberId ?? ""
      }
    }
  );

  expect(counterpartyResponse.ok()).toBeTruthy();

  const counterpartyView = parseDarkSubscriberStateResponse(await counterpartyResponse.json());
  expect(counterpartyView.proposals[0]?.proposalId).toBe(status.proposalId);
  expect(counterpartyView.orders).toHaveLength(1);
  expect(
    counterpartyView.locks.some(
      (lock) =>
        lock.proposalId === status.proposalId && lock.subscriberId === status.secondarySubscriberId
    )
  ).toBe(true);

  const unauthorizedResponse = await request.get(
    `${urls.api}/pairs/${status.pairId}/views/dark-subscriber?subscriberId=${status.subscriberId}`,
    {
      headers: {
        "x-actor-id": "subscriber-outsider"
      }
    }
  );

  expect(unauthorizedResponse.status()).toBe(403);
});
