import { mountDealerWorkbench, type AppBootOptions } from "@canton-dark/ui-sdk";

export const bootDealerWorkbench = async (options: AppBootOptions): Promise<void> =>
  mountDealerWorkbench(options);
