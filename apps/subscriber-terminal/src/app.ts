import { mountSubscriberTerminal, type AppBootOptions } from "@canton-dark/ui-sdk";

export const bootSubscriberTerminal = async (options: AppBootOptions): Promise<void> =>
  mountSubscriberTerminal(options);
