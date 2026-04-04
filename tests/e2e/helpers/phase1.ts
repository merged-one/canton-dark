import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { parseDemoStatusResponse, type DemoStatusResponse } from "@canton-dark/api-contracts";

export const urls = {
  api: "http://127.0.0.1:4301",
  dealer: "http://127.0.0.1:4175",
  demo: "http://127.0.0.1:4172",
  operator: "http://127.0.0.1:4173",
  subscriber: "http://127.0.0.1:4174"
} as const;

export const authFiles = {
  dealer: "tests/e2e/.auth/dealer-alpha.json",
  dealerAlpha: "tests/e2e/.auth/dealer-alpha.json",
  dealerBeta: "tests/e2e/.auth/dealer-beta.json",
  dealerGamma: "tests/e2e/.auth/dealer-gamma.json",
  dealerOutsider: "tests/e2e/.auth/dealer-outsider.json",
  operator: "tests/e2e/.auth/operator.json",
  subscriber: "tests/e2e/.auth/subscriber.json"
} as const;

export const resetDemo = async (
  request: APIRequestContext,
  mode: "empty" | "phase1-complete" | "phase1-ready" | "phase2-ready" | "phase3-ready"
): Promise<DemoStatusResponse> => {
  const response = await request.post(`${urls.api}/demo/reset`, {
    data: {
      mode
    }
  });

  expect(response.ok()).toBeTruthy();

  return parseDemoStatusResponse(await response.json());
};

export const advanceClock = async (
  request: APIRequestContext,
  milliseconds: number
): Promise<void> => {
  const response = await request.post(`${urls.api}/demo/clock/advance`, {
    data: {
      milliseconds
    }
  });

  expect(response.ok()).toBeTruthy();
};

export const seedPair = async (
  request: APIRequestContext,
  pairId: string,
  subscriberId = "subscriber-1"
): Promise<void> => {
  const createResponse = await request.post(`${urls.api}/pairs`, {
    data: {
      dealerId: "dealer-alpha",
      jurisdiction: "US",
      mode: "SingleDealerPair",
      operatorId: "operator-demo",
      pairId,
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    },
    headers: {
      "x-actor-id": "operator-demo"
    }
  });

  expect(createResponse.ok()).toBeTruthy();

  const accessResponse = await request.post(`${urls.api}/pairs/${pairId}/access`, {
    data: {
      role: "subscriber",
      subjectId: subscriberId
    },
    headers: {
      "x-actor-id": "operator-demo"
    }
  });

  expect(accessResponse.ok()).toBeTruthy();
};

export const seedAtsPair = async (
  request: APIRequestContext,
  input: {
    dealerIds: string[];
    inviteRevisionPolicy?: "before_first_response" | "locked";
    operatorId?: string;
    oversightRole?: "blinded" | "full";
    pairId: string;
    subscriberId?: string;
  }
): Promise<void> => {
  const operatorId = input.operatorId ?? "operator-demo";
  const subscriberId = input.subscriberId ?? "subscriber-1";
  const createResponse = await request.post(`${urls.api}/pairs`, {
    data: {
      dealerIds: input.dealerIds,
      inviteRevisionPolicy: input.inviteRevisionPolicy ?? "before_first_response",
      jurisdiction: "US",
      mode: "ATSPair",
      operatorId,
      operatorOversightRole: input.oversightRole ?? "blinded",
      pairId: input.pairId,
      rulebookSummary: "phase 2 ats demo",
      rulebookVersion: "v2"
    },
    headers: {
      "x-actor-id": operatorId
    }
  });

  expect(createResponse.ok()).toBeTruthy();

  const subscriberAccessResponse = await request.post(`${urls.api}/pairs/${input.pairId}/access`, {
    data: {
      role: "subscriber",
      subjectId: subscriberId
    },
    headers: {
      "x-actor-id": operatorId
    }
  });

  expect(subscriberAccessResponse.ok()).toBeTruthy();

  for (const dealerId of input.dealerIds) {
    const dealerAccessResponse = await request.post(`${urls.api}/pairs/${input.pairId}/access`, {
      data: {
        role: "dealer",
        subjectId: dealerId
      },
      headers: {
        "x-actor-id": operatorId
      }
    });

    expect(dealerAccessResponse.ok()).toBeTruthy();
  }
};

export const accessibilitySmoke = async (page: Page): Promise<void> => {
  const issues = await page.evaluate(() => {
    const unlabeledFields = [...document.querySelectorAll("input, select, textarea")]
      .filter((element) => {
        const control = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

        return (
          control.labels?.length !== 1 &&
          control.getAttribute("aria-label") === null &&
          control.getAttribute("aria-labelledby") === null
        );
      })
      .map((element) => (element as HTMLElement).id || element.tagName.toLowerCase());

    const namelessButtons = [...document.querySelectorAll("button")]
      .filter((element) => {
        const label = element.getAttribute("aria-label") ?? element.textContent;

        return label.trim() === "";
      })
      .map((element) => (element as HTMLElement).outerHTML);

    return {
      headings: document.querySelectorAll("h1").length,
      mainLandmarks: document.querySelectorAll("main").length,
      namelessButtons,
      unlabeledFields
    };
  });

  expect(issues.mainLandmarks).toBe(1);
  expect(issues.headings).toBe(1);
  expect(issues.unlabeledFields).toEqual([]);
  expect(issues.namelessButtons).toEqual([]);
};
