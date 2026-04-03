import { mountOperatorConsole, type AppBootOptions } from "@canton-dark/ui-sdk";

export const bootOperatorConsole = async (options: AppBootOptions): Promise<void> =>
  mountOperatorConsole(options);
