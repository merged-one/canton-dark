import { describe, expect, it } from "vitest";

import * as sdk from "./index";

describe("ui-sdk barrel", () => {
  it("re-exports the public frontend helpers", () => {
    expect(sdk.buildRoleUrl).toBeTypeOf("function");
    expect(sdk.createVenueApiClient).toBeTypeOf("function");
    expect(sdk.mountOperatorConsole).toBeTypeOf("function");
    expect(sdk.mountSubscriberTerminal).toBeTypeOf("function");
    expect(sdk.mountDealerWorkbench).toBeTypeOf("function");
    expect(sdk.mountDemoOrchestrator).toBeTypeOf("function");
    expect(sdk.resolveApiBaseUrl).toBeTypeOf("function");
    expect(sdk.demoIdentities.operator[0]?.actorId).toBe("operator-demo");
  });
});
