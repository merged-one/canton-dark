import {
  parseAuditTrailView,
  parseDealerWorkbenchView,
  parseDealerInvitationHistoryView,
  parseDemoStatusResponse,
  parseOperatorOversightView,
  parseOperatorView,
  parseQuoteComparisonView,
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
  DealerInvitationHistoryView,
  DealerWorkbenchView,
  OperatorOversightView,
  OperatorView,
  QuoteComparisonView,
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
  getDealerInvitationHistory: (input: {
    actorId: string;
    dealerId: string;
    pairId: string;
  }) => Promise<DealerInvitationHistoryView>;
  getDealerWorkbenchView: (input: {
    actorId: string;
    dealerId: string;
    pairId: string;
  }) => Promise<DealerWorkbenchView>;
  getDemoStatus: () => Promise<DemoStatusResponse>;
  getOperatorOversightView: (input: {
    actorId: string;
    pairId: string;
  }) => Promise<OperatorOversightView>;
  getOperatorView: (input: { actorId: string; pairId: string }) => Promise<OperatorView>;
  getSubscriberQuoteLadder: (input: {
    actorId: string;
    pairId: string;
    rfqId: string;
  }) => Promise<QuoteComparisonView>;
  getSubscriberView: (input: {
    actorId: string;
    pairId: string;
    subscriberId: string;
  }) => Promise<SubscriberView>;
  grantAccess: (input: GrantAccessRequest & { actorId: string; pairId: string }) => Promise<void>;
  inviteDealers: (input: {
    actorId: string;
    dealerIds: readonly string[];
    pairId: string;
    rfqId: string;
  }) => Promise<void>;
  markSettlementProgression: (input: {
    actorId: string;
    instructionId: string;
    pairId: string;
    status: MarkSettlementProgressionRequest["status"];
  }) => Promise<void>;
  openRfq: (input: OpenRfqRequest & { actorId: string; pairId: string }) => Promise<void>;
  pausePair: (input: PausePairRequest & { actorId: string; pairId: string }) => Promise<void>;
  rejectAllQuotes: (input: {
    actorId: string;
    pairId: string;
    reason?: string;
    rfqId: string;
  }) => Promise<void>;
  resetDemoState: (input: DemoResetRequest) => Promise<DemoStatusResponse>;
  reviseInviteSet: (input: {
    actorId: string;
    dealerIds: readonly string[];
    pairId: string;
    rfqId: string;
  }) => Promise<void>;
  reviseQuote: (
    input: {
      actorId: string;
      pairId: string;
      quoteId: string;
    } & SubmitQuoteRequest
  ) => Promise<void>;
  submitQuote: (
    input: {
      actorId: string;
      pairId: string;
      rfqId: string;
    } & SubmitQuoteRequest
  ) => Promise<void>;
  withdrawQuote: (input: {
    actorId: string;
    pairId: string;
    quoteId: string;
    reason?: string;
  }) => Promise<void>;
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
    getDealerInvitationHistory: ({ actorId, dealerId, pairId }) =>
      request(`/pairs/${pairId}/dealers/${dealerId}/history`, {
        actorId,
        parser: parseDealerInvitationHistoryView
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
    getOperatorOversightView: ({ actorId, pairId }) =>
      request(`/pairs/${pairId}/views/operator-oversight`, {
        actorId,
        parser: parseOperatorOversightView
      }),
    getOperatorView: ({ actorId, pairId }) =>
      request(`/pairs/${pairId}/views/operator`, {
        actorId,
        parser: parseOperatorView
      }),
    getSubscriberQuoteLadder: ({ actorId, pairId, rfqId }) =>
      request(`/pairs/${pairId}/rfqs/${rfqId}/quote-ladder`, {
        actorId,
        parser: parseQuoteComparisonView
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
    inviteDealers: async ({ actorId, pairId, rfqId, ...body }) => {
      await request(`/pairs/${pairId}/rfqs/${rfqId}/invite-dealers`, {
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
    rejectAllQuotes: async ({ actorId, pairId, rfqId, ...body }) => {
      await request(`/pairs/${pairId}/rfqs/${rfqId}/reject-all`, {
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
    reviseInviteSet: async ({ actorId, pairId, rfqId, ...body }) => {
      await request(`/pairs/${pairId}/rfqs/${rfqId}/revise-invite-set`, {
        actorId,
        body,
        method: "POST"
      });
    },
    reviseQuote: async ({ actorId, pairId, quoteId, ...body }) => {
      await request(`/pairs/${pairId}/quotes/${quoteId}/revise`, {
        actorId,
        body,
        method: "POST"
      });
    },
    submitQuote: async ({ actorId, pairId, rfqId, ...body }) => {
      await request(`/pairs/${pairId}/rfqs/${rfqId}/quotes`, {
        actorId,
        body,
        method: "POST"
      });
    },
    withdrawQuote: async ({ actorId, pairId, quoteId, ...body }) => {
      await request(`/pairs/${pairId}/quotes/${quoteId}/withdraw`, {
        actorId,
        body,
        method: "POST"
      });
    }
  };
};
