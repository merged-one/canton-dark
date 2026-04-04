import { expect, test } from "@playwright/test";

import {
  accessibilitySmoke,
  advanceClock,
  authFiles,
  resetDemo,
  seedPair,
  urls
} from "./helpers/phase1";

test("@phase1 @smoke primary lifecycle across operator, subscriber, and dealer apps", async ({
  browser,
  request
}) => {
  const pairId = "pair-phase1-flow";

  await resetDemo(request, "empty");

  const operatorContext = await browser.newContext({ storageState: authFiles.operator });
  const subscriberContext = await browser.newContext({ storageState: authFiles.subscriber });
  const dealerContext = await browser.newContext({ storageState: authFiles.dealer });
  const operatorPage = await operatorContext.newPage();
  const subscriberPage = await subscriberContext.newPage();
  const dealerPage = await dealerContext.newPage();

  await operatorPage.goto(`${urls.operator}/?pairId=${pairId}`);
  await operatorPage
    .locator("[data-testid='operator-create-form']")
    .getByLabel("Pair ID")
    .fill(pairId);
  await operatorPage
    .locator("[data-testid='operator-create-form']")
    .getByLabel("Mode")
    .selectOption("SingleDealerPair");
  await operatorPage
    .locator("[data-testid='operator-create-form']")
    .getByRole("button", { name: "Create pair" })
    .click();
  await expect(operatorPage.getByTestId("operator-notice")).toContainText(
    `Created pair ${pairId}.`
  );
  await operatorPage
    .locator("[data-testid='operator-access-form']")
    .getByLabel("Subject ID")
    .fill("subscriber-1");
  await operatorPage
    .locator("[data-testid='operator-access-form']")
    .getByRole("button", { name: "Grant access" })
    .click();
  await expect(operatorPage.getByTestId("operator-pair-detail")).toContainText("subscriber-1");
  await accessibilitySmoke(operatorPage);

  await subscriberPage.goto(`${urls.subscriber}/?pairId=${pairId}`);
  await subscriberPage
    .locator("[data-testid='subscriber-rfq-form']")
    .getByLabel("Instrument")
    .fill("CUSIP-1");
  await subscriberPage
    .locator("[data-testid='subscriber-rfq-form']")
    .getByLabel("Quantity")
    .fill("50");
  await subscriberPage
    .locator("[data-testid='subscriber-rfq-form']")
    .getByRole("button", { name: "Open RFQ" })
    .click();
  await expect(subscriberPage.getByTestId("subscriber-notice")).toContainText("Opened RFQ");
  await accessibilitySmoke(subscriberPage);

  await dealerPage.goto(`${urls.dealer}/?pairId=${pairId}`);
  await expect(dealerPage.getByTestId("dealer-invitation-detail")).toContainText("rfq-");
  await accessibilitySmoke(dealerPage);
  await dealerPage
    .locator("[data-testid='dealer-quote-form']")
    .getByRole("button", { name: "Submit quote" })
    .click();
  await expect(dealerPage.getByTestId("dealer-notice")).toContainText("Dealer quote updated.");

  await subscriberPage
    .locator("[data-testid='subscriber-pair-form']")
    .getByRole("button", { name: "Refresh" })
    .click();
  await expect(subscriberPage.getByTestId("subscriber-compare-screen")).toContainText("quote-");
  await subscriberPage.getByRole("button", { name: "Accept quote" }).first().click();
  await expect(subscriberPage.getByTestId("subscriber-notice")).toContainText("Accepted quote");

  await operatorPage
    .locator("[data-testid='operator-pair-form']")
    .getByRole("button", { name: "Refresh" })
    .click();
  await expect(operatorPage.getByTestId("operator-pair-detail")).toContainText("execution-");
  await expect(operatorPage.getByTestId("operator-pair-detail")).toContainText("settlement-");

  await dealerPage
    .locator("[data-testid='dealer-pair-form']")
    .getByRole("button", { name: "Refresh" })
    .click();
  await expect(dealerPage.getByTestId("dealer-invitation-detail")).toContainText("execution-");

  await subscriberPage
    .locator("[data-testid='subscriber-pair-form']")
    .getByRole("button", { name: "Refresh" })
    .click();
  await expect(subscriberPage.getByTestId("subscriber-compare-screen")).toContainText(
    "settlement-"
  );

  await operatorContext.close();
  await subscriberContext.close();
  await dealerContext.close();
});

test("@phase1 late quote rejection blocks acceptance after expiry", async ({
  browser,
  request
}) => {
  const pairId = "pair-phase1-late";

  await resetDemo(request, "empty");
  await seedPair(request, pairId);

  const subscriberContext = await browser.newContext({ storageState: authFiles.subscriber });
  const dealerContext = await browser.newContext({ storageState: authFiles.dealer });
  const subscriberPage = await subscriberContext.newPage();
  const dealerPage = await dealerContext.newPage();

  await subscriberPage.goto(`${urls.subscriber}/?pairId=${pairId}`);
  await subscriberPage
    .locator("[data-testid='subscriber-rfq-form']")
    .getByLabel("Instrument")
    .fill("CUSIP-LATE");
  await subscriberPage
    .locator("[data-testid='subscriber-rfq-form']")
    .getByLabel("Quantity")
    .fill("10");
  await subscriberPage
    .locator("[data-testid='subscriber-rfq-form']")
    .getByRole("button", { name: "Open RFQ" })
    .click();
  await expect(subscriberPage.getByTestId("subscriber-notice")).toContainText("Opened RFQ");

  await dealerPage.goto(`${urls.dealer}/?pairId=${pairId}`);
  await expect(dealerPage.getByTestId("dealer-invitation-detail")).toContainText("rfq-");
  await dealerPage
    .locator("[data-testid='dealer-quote-form']")
    .getByLabel("Term minutes")
    .fill("1");
  await dealerPage
    .locator("[data-testid='dealer-quote-form']")
    .getByRole("button", { name: "Submit quote" })
    .click();

  await advanceClock(request, 120_000);

  await subscriberPage
    .locator("[data-testid='subscriber-pair-form']")
    .getByRole("button", { name: "Refresh" })
    .click();
  await expect(subscriberPage.getByTestId("subscriber-compare-screen")).toContainText("Expired");
  await expect(subscriberPage.getByRole("button", { name: "Accept quote" })).toHaveCount(0);

  await subscriberContext.close();
  await dealerContext.close();
});

test("@phase1 paused pair blocks new RFQs", async ({ browser, request }) => {
  const pairId = "pair-phase1-paused";

  await resetDemo(request, "empty");
  await seedPair(request, pairId);

  const operatorContext = await browser.newContext({ storageState: authFiles.operator });
  const subscriberContext = await browser.newContext({ storageState: authFiles.subscriber });
  const operatorPage = await operatorContext.newPage();
  const subscriberPage = await subscriberContext.newPage();

  await operatorPage.goto(`${urls.operator}/?pairId=${pairId}`);
  await operatorPage.getByRole("button", { name: "Pause pair" }).click();
  await expect(operatorPage.getByTestId("operator-notice")).toContainText("Pair paused.");

  await subscriberPage.goto(`${urls.subscriber}/?pairId=${pairId}`);
  await subscriberPage
    .locator("[data-testid='subscriber-rfq-form']")
    .getByLabel("Instrument")
    .fill("CUSIP-PAUSED");
  await subscriberPage
    .locator("[data-testid='subscriber-rfq-form']")
    .getByLabel("Quantity")
    .fill("5");
  await subscriberPage
    .locator("[data-testid='subscriber-rfq-form']")
    .getByRole("button", { name: "Open RFQ" })
    .click();

  await expect(subscriberPage.getByTestId("subscriber-notice")).toContainText(
    "Trading commands are unavailable while the pair is paused."
  );

  await operatorContext.close();
  await subscriberContext.close();
});

test("@phase1 unauthorized subscriber cannot access the pair", async ({ browser, request }) => {
  const pairId = "pair-phase1-unauthorized";

  await resetDemo(request, "empty");
  await seedPair(request, pairId);

  const outsiderContext = await browser.newContext();
  const outsiderPage = await outsiderContext.newPage();

  await outsiderPage.goto(`${urls.subscriber}/?pairId=${pairId}`);
  await outsiderPage
    .locator("[data-testid='subscriber-session-form']")
    .getByLabel("Actor ID")
    .fill("subscriber-outsider");
  await outsiderPage
    .locator("[data-testid='subscriber-session-form']")
    .getByRole("button", { name: "Save session" })
    .click();

  await expect(outsiderPage.getByTestId("subscriber-notice")).toContainText(
    "Actor subscriber-outsider is missing view_pair permission for pair pair-phase1-unauthorized."
  );

  await outsiderContext.close();
});
