import { test } from "@playwright/test";

import { authFiles, urls } from "./helpers/phase1";

test("save role auth state for phase 1 frontends", async ({ browser }) => {
  const operatorContext = await browser.newContext();
  const operatorPage = await operatorContext.newPage();

  await operatorPage.goto(urls.operator);
  await operatorPage
    .locator("[data-testid='operator-session-form']")
    .getByLabel("Actor ID")
    .fill("operator-demo");
  await operatorPage.locator("[data-testid='operator-session-form']").getByRole("button").click();
  await operatorContext.storageState({ path: authFiles.operator });
  await operatorContext.close();

  const subscriberContext = await browser.newContext();
  const subscriberPage = await subscriberContext.newPage();

  await subscriberPage.goto(urls.subscriber);
  await subscriberPage
    .locator("[data-testid='subscriber-session-form']")
    .getByLabel("Actor ID")
    .fill("subscriber-1");
  await subscriberPage
    .locator("[data-testid='subscriber-session-form']")
    .getByRole("button")
    .click();
  await subscriberContext.storageState({ path: authFiles.subscriber });
  await subscriberContext.close();

  const dealerContext = await browser.newContext();
  const dealerPage = await dealerContext.newPage();

  await dealerPage.goto(urls.dealer);
  await dealerPage
    .locator("[data-testid='dealer-session-form']")
    .getByLabel("Actor ID")
    .fill("dealer-alpha");
  await dealerPage.locator("[data-testid='dealer-session-form']").getByRole("button").click();
  await dealerContext.storageState({ path: authFiles.dealer });
  await dealerContext.close();
});
