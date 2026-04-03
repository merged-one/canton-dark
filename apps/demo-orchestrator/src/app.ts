import { mountDemoOrchestrator, type AppBootOptions } from "@canton-dark/ui-sdk";

export const bootDemoOrchestrator = async (options: AppBootOptions): Promise<void> =>
  mountDemoOrchestrator(options);
