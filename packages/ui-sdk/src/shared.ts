import type { LocationLike } from "./auth";
import { VenueApiClientError } from "./api-client";

type FetchLike = typeof fetch;

export type AppBootOptions = {
  apiBaseUrl?: string;
  fetchImpl?: FetchLike;
  location?: LocationLike;
  root: HTMLElement;
  storage?: Storage;
};

export const resolveApiBaseUrl = (apiBaseUrl?: string): string =>
  apiBaseUrl ??
  (import.meta as ImportMeta & { env: { VITE_VENUE_API_BASE_URL?: string } }).env
    .VITE_VENUE_API_BASE_URL ??
  "http://127.0.0.1:4301";

export const toErrorMessage = (error: unknown): string =>
  error instanceof VenueApiClientError || error instanceof Error
    ? error.message
    : "Unexpected error";

export const readValue = (root: ParentNode, selector: string): string => {
  const field = root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    selector
  );

  if (field === null) {
    throw new Error(`Expected field ${selector} to exist.`);
  }

  return field.value;
};
