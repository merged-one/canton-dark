import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

import {
  accessibilitySmoke,
  advanceClock,
  authFiles,
  resetDemo,
  seedAtsPair,
  urls
} from "./helpers/phase1";

test.use({
  viewport: {
    height: 1280,
    width: 1440
  }
});

const createAuthedPage = async (
  browser: Browser,
  storageState: string
): Promise<{ context: BrowserContext; page: Page }> => {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  return {
    context,
    page
  };
};

const gotoRolePair = async (page: Page, roleUrl: string, pairId: string): Promise<void> => {
  await page.goto(`${roleUrl}/?pairId=${encodeURIComponent(pairId)}`);
};

const refreshPair = async (
  page: Page,
  formTestId: "dealer-pair-form" | "operator-pair-form" | "subscriber-pair-form"
): Promise<void> => {
  await page
    .locator(`[data-testid='${formTestId}']`)
    .getByRole("button", { name: "Refresh" })
    .click();
};

const openDirectedRfq = async (
  page: Page,
  input: {
    instrumentId: string;
    invitedDealerIds: string[];
    quantity: number;
    responseWindowMinutes?: number;
  }
): Promise<void> => {
  const form = page.locator("[data-testid='subscriber-rfq-form']");

  await form.getByLabel("Instrument").fill(input.instrumentId);
  await form.getByLabel("Quantity").fill(String(input.quantity));
  await form
    .getByLabel("Response window (minutes)")
    .fill(String(input.responseWindowMinutes ?? 10));

  for (const dealerId of ["dealer-alpha", "dealer-beta", "dealer-gamma"]) {
    const checkbox = page.locator(`#subscriber-dealer-${dealerId}`);

    if ((await checkbox.count()) === 0) {
      continue;
    }

    if (input.invitedDealerIds.includes(dealerId)) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  await form.getByRole("button", { name: "Open directed RFQ" }).click();
  await expect(page.getByTestId("subscriber-notice")).toContainText("Opened RFQ");
};

const submitDealerQuote = async (
  page: Page,
  input: {
    price: string;
    quantity?: number;
    ttlMinutes?: number;
  }
): Promise<void> => {
  const form = page.locator("[data-testid='dealer-quote-form']");

  await form.getByLabel("Price").fill(input.price);
  await form.getByLabel("Quantity").fill(String(input.quantity ?? 50));
  await form.getByLabel("Term minutes").fill(String(input.ttlMinutes ?? 20));
  await form.getByRole("button", { name: /Submit quote|Revise quote/ }).click();
  await expect(page.getByTestId("dealer-notice")).toContainText("Dealer quote updated.");
};

const acceptQuoteForDealer = async (page: Page, dealerId: string): Promise<void> => {
  const row = page.locator("tr").filter({ hasText: dealerId }).filter({ hasText: "Accept quote" });

  await row.getByRole("button", { name: "Accept quote" }).click();
};

test("@phase2 @smoke happy path across subscriber, three dealers, and operator", async ({
  browser,
  request
}) => {
  const status = await resetDemo(request, "phase2-ready");
  const pairId = status.pairId;

  const operator = await createAuthedPage(browser, authFiles.operator);
  const subscriber = await createAuthedPage(browser, authFiles.subscriber);
  const dealerAlpha = await createAuthedPage(browser, authFiles.dealerAlpha);
  const dealerBeta = await createAuthedPage(browser, authFiles.dealerBeta);
  const dealerGamma = await createAuthedPage(browser, authFiles.dealerGamma);

  await gotoRolePair(operator.page, urls.operator, pairId);
  await expect(operator.page.getByTestId("operator-pair-detail")).toContainText(pairId);

  await gotoRolePair(subscriber.page, urls.subscriber, pairId);
  await openDirectedRfq(subscriber.page, {
    instrumentId: "CUSIP-ATS-HAPPY",
    invitedDealerIds: ["dealer-alpha", "dealer-beta", "dealer-gamma"],
    quantity: 100,
    responseWindowMinutes: 15
  });

  await gotoRolePair(dealerAlpha.page, urls.dealer, pairId);
  await gotoRolePair(dealerBeta.page, urls.dealer, pairId);
  await gotoRolePair(dealerGamma.page, urls.dealer, pairId);

  await submitDealerQuote(dealerAlpha.page, { price: "99.10", quantity: 100 });
  await submitDealerQuote(dealerBeta.page, { price: "99.80", quantity: 100 });
  await submitDealerQuote(dealerGamma.page, { price: "100.40", quantity: 100 });

  await refreshPair(subscriber.page, "subscriber-pair-form");
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText(
    "dealer-alpha"
  );
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText(
    "dealer-beta"
  );
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText(
    "dealer-gamma"
  );
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText("99.10");
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText("99.80");
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText("100.40");
  await accessibilitySmoke(subscriber.page);

  await refreshPair(operator.page, "operator-pair-form");
  await expect(operator.page.getByTestId("operator-pair-detail")).toContainText(
    "Directed invitations"
  );
  await accessibilitySmoke(operator.page);

  await accessibilitySmoke(dealerAlpha.page);

  await acceptQuoteForDealer(subscriber.page, "dealer-alpha");
  await expect(subscriber.page.getByTestId("subscriber-notice")).toContainText("Accepted quote");
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText(
    "settlement-"
  );

  await refreshPair(operator.page, "operator-pair-form");
  await expect(operator.page.getByTestId("operator-pair-detail")).toContainText("execution-");
  await expect(operator.page.getByTestId("operator-pair-detail")).toContainText("settlement-");

  await refreshPair(dealerAlpha.page, "dealer-pair-form");
  await refreshPair(dealerBeta.page, "dealer-pair-form");
  await refreshPair(dealerGamma.page, "dealer-pair-form");
  await expect(dealerAlpha.page.getByTestId("dealer-invitation-detail")).toContainText(
    "execution-"
  );
  await expect(dealerBeta.page.getByTestId("dealer-invitation-detail")).not.toContainText(
    "dealer-alpha"
  );
  await expect(dealerGamma.page.getByTestId("dealer-invitation-detail")).not.toContainText(
    "dealer-beta"
  );

  await operator.context.close();
  await subscriber.context.close();
  await dealerAlpha.context.close();
  await dealerBeta.context.close();
  await dealerGamma.context.close();
});

test("@phase2 late dealer is blocked once the response window closes", async ({
  browser,
  request
}) => {
  const status = await resetDemo(request, "phase2-ready");
  const pairId = status.pairId;

  const subscriber = await createAuthedPage(browser, authFiles.subscriber);
  const dealerAlpha = await createAuthedPage(browser, authFiles.dealerAlpha);
  const dealerBeta = await createAuthedPage(browser, authFiles.dealerBeta);
  const dealerGamma = await createAuthedPage(browser, authFiles.dealerGamma);

  await gotoRolePair(subscriber.page, urls.subscriber, pairId);
  await openDirectedRfq(subscriber.page, {
    instrumentId: "CUSIP-ATS-LATE",
    invitedDealerIds: ["dealer-alpha", "dealer-beta", "dealer-gamma"],
    quantity: 25,
    responseWindowMinutes: 1
  });

  await gotoRolePair(dealerAlpha.page, urls.dealer, pairId);
  await gotoRolePair(dealerBeta.page, urls.dealer, pairId);
  await gotoRolePair(dealerGamma.page, urls.dealer, pairId);

  await submitDealerQuote(dealerAlpha.page, { price: "99.50", quantity: 25 });
  await submitDealerQuote(dealerBeta.page, { price: "99.90", quantity: 25 });

  await advanceClock(request, 120_000);
  await refreshPair(dealerGamma.page, "dealer-pair-form");

  const gammaForm = dealerGamma.page.locator("[data-testid='dealer-quote-form']");
  await gammaForm.getByLabel("Price").fill("100.25");
  await gammaForm.getByLabel("Quantity").fill("25");
  await gammaForm.getByLabel("Term minutes").fill("20");
  await gammaForm.getByRole("button", { name: /Submit quote|Revise quote/ }).click();

  await expect(dealerGamma.page.getByTestId("dealer-notice")).toContainText(
    "Dealers may not submit or revise quotes after the response window closes."
  );

  await refreshPair(subscriber.page, "subscriber-pair-form");
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText("Expired");
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).not.toContainText(
    "100.25"
  );

  await subscriber.context.close();
  await dealerAlpha.context.close();
  await dealerBeta.context.close();
  await dealerGamma.context.close();
});

test("@phase2 withdrawn quotes remain visible to the subscriber but close the dealer action", async ({
  browser,
  request
}) => {
  const status = await resetDemo(request, "phase2-ready");
  const pairId = status.pairId;

  const subscriber = await createAuthedPage(browser, authFiles.subscriber);
  const dealerAlpha = await createAuthedPage(browser, authFiles.dealerAlpha);
  const dealerBeta = await createAuthedPage(browser, authFiles.dealerBeta);

  await gotoRolePair(subscriber.page, urls.subscriber, pairId);
  await openDirectedRfq(subscriber.page, {
    instrumentId: "CUSIP-ATS-WITHDRAW",
    invitedDealerIds: ["dealer-alpha", "dealer-beta"],
    quantity: 40
  });

  await gotoRolePair(dealerAlpha.page, urls.dealer, pairId);
  await gotoRolePair(dealerBeta.page, urls.dealer, pairId);

  await submitDealerQuote(dealerAlpha.page, { price: "98.75", quantity: 40 });
  await submitDealerQuote(dealerBeta.page, { price: "99.60", quantity: 40 });

  await dealerBeta.page.getByRole("button", { name: "Withdraw current quote" }).click();
  await expect(dealerBeta.page.getByTestId("dealer-notice")).toContainText("Withdrew quote");

  await refreshPair(subscriber.page, "subscriber-pair-form");
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText("Withdrawn");
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText("98.75");
  await expect(dealerBeta.page.getByTestId("dealer-invitation-detail")).toContainText(
    "No open quote"
  );

  await subscriber.context.close();
  await dealerAlpha.context.close();
  await dealerBeta.context.close();
});

test("@phase2 unauthorized dealer is blocked from a pair outside its dealer universe", async ({
  browser,
  request
}) => {
  const pairId = "pair-phase2-restricted";

  await resetDemo(request, "empty");
  await seedAtsPair(request, {
    dealerIds: ["dealer-alpha", "dealer-beta"],
    pairId
  });

  const dealerGamma = await createAuthedPage(browser, authFiles.dealerGamma);

  await gotoRolePair(dealerGamma.page, urls.dealer, pairId);
  await expect(dealerGamma.page.getByTestId("dealer-notice")).toContainText(
    "Actor dealer-gamma is missing view_pair permission for pair pair-phase2-restricted."
  );

  await dealerGamma.context.close();
});

test("@phase2 confidentiality stays scoped across dealer browser contexts", async ({
  browser,
  request
}) => {
  const status = await resetDemo(request, "phase2-ready");
  const pairId = status.pairId;

  const operator = await createAuthedPage(browser, authFiles.operator);
  const subscriber = await createAuthedPage(browser, authFiles.subscriber);
  const dealerAlpha = await createAuthedPage(browser, authFiles.dealerAlpha);
  const dealerBeta = await createAuthedPage(browser, authFiles.dealerBeta);
  const dealerGamma = await createAuthedPage(browser, authFiles.dealerGamma);

  await gotoRolePair(subscriber.page, urls.subscriber, pairId);
  await openDirectedRfq(subscriber.page, {
    instrumentId: "CUSIP-ATS-PRIVACY",
    invitedDealerIds: ["dealer-alpha", "dealer-beta"],
    quantity: 60
  });

  await gotoRolePair(operator.page, urls.operator, pairId);
  await gotoRolePair(dealerAlpha.page, urls.dealer, pairId);
  await gotoRolePair(dealerBeta.page, urls.dealer, pairId);
  await gotoRolePair(dealerGamma.page, urls.dealer, pairId);

  await submitDealerQuote(dealerAlpha.page, { price: "97.10", quantity: 60 });
  await submitDealerQuote(dealerBeta.page, { price: "97.85", quantity: 60 });

  await refreshPair(subscriber.page, "subscriber-pair-form");
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText("97.10");
  await expect(subscriber.page.getByTestId("subscriber-compare-screen")).toContainText("97.85");

  await refreshPair(dealerAlpha.page, "dealer-pair-form");
  await refreshPair(dealerBeta.page, "dealer-pair-form");
  await refreshPair(dealerGamma.page, "dealer-pair-form");
  await refreshPair(operator.page, "operator-pair-form");

  await expect(dealerAlpha.page.getByTestId("dealer-invitation-detail")).toContainText("97.10");
  await expect(dealerAlpha.page.getByTestId("dealer-invitation-detail")).not.toContainText("97.85");
  await expect(dealerAlpha.page.getByTestId("dealer-invitation-detail")).not.toContainText(
    "dealer-beta"
  );

  await expect(dealerBeta.page.getByTestId("dealer-invitation-detail")).toContainText("97.85");
  await expect(dealerBeta.page.getByTestId("dealer-invitation-detail")).not.toContainText("97.10");
  await expect(dealerBeta.page.getByTestId("dealer-invitation-detail")).not.toContainText(
    "dealer-alpha"
  );

  await expect(dealerGamma.page.getByTestId("dealer-invitation-detail")).toContainText(
    "No invitations are visible for this dealer."
  );
  await expect(dealerGamma.page.getByTestId("dealer-invitation-detail")).not.toContainText("97.10");
  await expect(dealerGamma.page.getByTestId("dealer-invitation-detail")).not.toContainText("97.85");

  await expect(operator.page.getByTestId("operator-pair-detail")).toContainText(
    "Blinded oversight redacts live quote ladders and non-accepted quote economics."
  );
  await expect(operator.page.getByTestId("operator-pair-detail")).toContainText("redacted");
  await expect(operator.page.getByTestId("operator-pair-detail")).not.toContainText("97.10");
  await expect(operator.page.getByTestId("operator-pair-detail")).not.toContainText("97.85");

  await operator.context.close();
  await subscriber.context.close();
  await dealerAlpha.context.close();
  await dealerBeta.context.close();
  await dealerGamma.context.close();
});
