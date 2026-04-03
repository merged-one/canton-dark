import {
  parseAuditTrailView,
  parseDealerWorkbenchView,
  parseDemoStatusResponse,
  parseOperatorView,
  parseSubscriberView,
  type CreatePairRequest,
  type DemoResetRequest,
  type DemoStatusResponse,
  type GrantAccessRequest,
  type MarkSettlementProgressionRequest,
  type OpenRfqRequest,
  type PausePairRequest,
  type SubmitQuoteRequest
} from "@canton-dark/api-contracts";
import type {
  AuditTrailView,
  DealerWorkbenchView,
  OperatorView,
  SubscriberView
} from "@canton-dark/query-models";

type FetchLike = typeof fetch;

type ApiErrorPayload = {
  code?: string;
  message?: string;
  path?: string;
};

export class VenueApiClientError extends Error {
  readonly code?: string;
  readonly path?: string;
  readonly status: number;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message ?? `Venue API request failed with status ${status}.`);
    this.name = "VenueApiClientError";
    this.status = status;

    if (payload.code !== undefined) {
      this.code = payload.code;
    }

    if (payload.path !== undefined) {
      this.path = payload.path;
    }
  }
}

export type VenueApiClient = {
  acceptQuote: (input: { actorId: string; pairId: string; quoteId: string }) => Promise<void>;
  advanceClock: (milliseconds: number) => Promise<DemoStatusResponse>;
  createPair: (input: CreatePairRequest & { actorId: string }) => Promise<void>;
  getAuditTrail: (input: { actorId: string; pairId: string }) => Promise<AuditTrailView>;
  getDealerWorkbenchView: (input: {
    actorId: string;
    dealerId: string;
    pairId: string;
  }) => Promise<DealerWorkbenchView>;
  getDemoStatus: () => Promise<DemoStatusResponse>;
  getOperatorView: (input: { actorId: string; pairId: string }) => Promise<OperatorView>;
  getSubscriberView: (input: {
    actorId: string;
    pairId: string;
    subscriberId: string;
  }) => Promise<SubscriberView>;
  grantAccess: (input: GrantAccessRequest & { actorId: string; pairId: string }) => Promise<void>;
  markSettlementProgression: (input: {
    actorId: string;
    instructionId: string;
    pairId: string;
    status: MarkSettlementProgressionRequest["status"];
  }) => Promise<void>;
  openRfq: (input: OpenRfqRequest & { actorId: string; pairId: string }) => Promise<void>;
  pausePair: (input: PausePairRequest & { actorId: string; pairId: string }) => Promise<void>;
  resetDemoState: (input: DemoResetRequest) => Promise<DemoStatusResponse>;
  submitQuote: (
    input: {
      actorId: string;
      pairId: string;
      rfqId: string;
    } & SubmitQuoteRequest
  ) => Promise<void>;
};

const parseJsonBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (text.trim() === "") {
    return {};
  }

  return JSON.parse(text) as unknown;
};

const toHeaders = (actorId?: string): HeadersInit =>
  actorId === undefined
    ? {
        "content-type": "application/json"
      }
    : {
        "content-type": "application/json",
        "x-actor-id": actorId
      };

export const createVenueApiClient = (input: {
  apiBaseUrl: string;
  fetchImpl?: FetchLike | undefined;
}): VenueApiClient => {
  const fetchImpl = input.fetchImpl ?? fetch;

  const request = async <T>(
    path: string,
    init: {
      actorId?: string;
      body?: unknown;
      method?: string;
      parser?: (value: unknown) => T;
    } = {}
  ): Promise<T> => {
    const response = await fetchImpl(`${input.apiBaseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: toHeaders(init.actorId),
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) })
    });
    const payload = await parseJsonBody(response);

    if (!response.ok) {
      throw new VenueApiClientError(response.status, payload as ApiErrorPayload);
    }

    return init.parser === undefined ? (undefined as T) : init.parser(payload);
  };

  return {
    acceptQuote: async ({ actorId, pairId, quoteId }) => {
      await request(`/pairs/${pairId}/quotes/${quoteId}/accept`, {
        actorId,
        method: "POST"
      });
    },
    advanceClock: (milliseconds) =>
      request("/demo/clock/advance", {
        body: {
          milliseconds
        },
        method: "POST",
        parser: parseDemoStatusResponse
      }),
    createPair: async ({ actorId, ...body }) => {
      await request("/pairs", {
        actorId,
        body,
        method: "POST"
      });
    },
    getAuditTrail: ({ actorId, pairId }) =>
      request(`/pairs/${pairId}/audit-trail`, {
        actorId,
        parser: parseAuditTrailView
      }),
    getDealerWorkbenchView: ({ actorId, dealerId, pairId }) =>
      request(
        `/pairs/${pairId}/views/dealer-workbench?${new URLSearchParams({ dealerId }).toString()}`,
        {
          actorId,
          parser: parseDealerWorkbenchView
        }
      ),
    getDemoStatus: () =>
      request("/demo/status", {
        parser: parseDemoStatusResponse
      }),
    getOperatorView: ({ actorId, pairId }) =>
      request(`/pairs/${pairId}/views/operator`, {
        actorId,
        parser: parseOperatorView
      }),
    getSubscriberView: ({ actorId, pairId, subscriberId }) =>
      request(
        `/pairs/${pairId}/views/subscriber?${new URLSearchParams({ subscriberId }).toString()}`,
        {
          actorId,
          parser: parseSubscriberView
        }
      ),
    grantAccess: async ({ actorId, pairId, ...body }) => {
      await request(`/pairs/${pairId}/access`, {
        actorId,
        body,
        method: "POST"
      });
    },
    markSettlementProgression: async ({ actorId, instructionId, pairId, status }) => {
      await request(`/pairs/${pairId}/settlements/${instructionId}/progress`, {
        actorId,
        body: {
          status
        },
        method: "POST"
      });
    },
    openRfq: async ({ actorId, pairId, ...body }) => {
      await request(`/pairs/${pairId}/rfqs`, {
        actorId,
        body,
        method: "POST"
      });
    },
    pausePair: async ({ actorId, pairId, ...body }) => {
      await request(`/pairs/${pairId}/pause`, {
        actorId,
        body,
        method: "POST"
      });
    },
    resetDemoState: (body) =>
      request("/demo/reset", {
        body,
        method: "POST",
        parser: parseDemoStatusResponse
      }),
    submitQuote: async ({ actorId, pairId, rfqId, ...body }) => {
      await request(`/pairs/${pairId}/rfqs/${rfqId}/quotes`, {
        actorId,
        body,
        method: "POST"
      });
    }
  };
};
