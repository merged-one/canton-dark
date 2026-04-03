import { test, type Browser } from "@playwright/test";

import { authFiles, urls } from "./helpers/phase1";

const saveRoleState = async (input: {
  actorId: string;
  browser: Browser;
  formTestId: string;
  path: string;
  url: string;
}): Promise<void> => {
  const context = await input.browser.newContext();
  const page = await context.newPage();

  await page.goto(input.url);
  await page
    .locator(`[data-testid='${input.formTestId}']`)
    .getByLabel("Actor ID")
    .fill(input.actorId);
  await page.locator(`[data-testid='${input.formTestId}']`).getByRole("button").click();
  await context.storageState({ path: input.path });
  await context.close();
};

test("save role auth state for phase 2 frontends", async ({ browser }) => {
  await saveRoleState({
    actorId: "operator-demo",
    browser,
    formTestId: "operator-session-form",
    path: authFiles.operator,
    url: urls.operator
  });
  await saveRoleState({
    actorId: "subscriber-1",
    browser,
    formTestId: "subscriber-session-form",
    path: authFiles.subscriber,
    url: urls.subscriber
  });
  await saveRoleState({
    actorId: "dealer-alpha",
    browser,
    formTestId: "dealer-session-form",
    path: authFiles.dealerAlpha,
    url: urls.dealer
  });
  await saveRoleState({
    actorId: "dealer-beta",
    browser,
    formTestId: "dealer-session-form",
    path: authFiles.dealerBeta,
    url: urls.dealer
  });
  await saveRoleState({
    actorId: "dealer-gamma",
    browser,
    formTestId: "dealer-session-form",
    path: authFiles.dealerGamma,
    url: urls.dealer
  });
  await saveRoleState({
    actorId: "dealer-outsider",
    browser,
    formTestId: "dealer-session-form",
    path: authFiles.dealerOutsider,
    url: urls.dealer
  });
});
