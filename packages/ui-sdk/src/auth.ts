export type DemoRole = "dealer" | "operator" | "subscriber";

export type DemoSession = {
  actorId: string;
  role: DemoRole;
};

export type DemoIdentity = {
  actorId: string;
  label: string;
  role: DemoRole;
};

export type LocationLike = Pick<URL, "search">;

export const frontendOrigins = {
  demo: "http://127.0.0.1:4172",
  dealer: "http://127.0.0.1:4175",
  operator: "http://127.0.0.1:4173",
  subscriber: "http://127.0.0.1:4174"
} as const;

const storageKeyPrefix = "canton-dark.demo.session";

export const demoIdentities: Record<DemoRole, readonly DemoIdentity[]> = {
  operator: [
    { actorId: "operator-demo", label: "Operator demo", role: "operator" },
    { actorId: "operator-ops", label: "Operator ops", role: "operator" }
  ],
  subscriber: [
    { actorId: "subscriber-1", label: "Subscriber demo", role: "subscriber" },
    { actorId: "subscriber-outsider", label: "Unauthorized subscriber", role: "subscriber" }
  ],
  dealer: [
    { actorId: "dealer-alpha", label: "Dealer alpha", role: "dealer" },
    { actorId: "dealer-beta", label: "Dealer beta", role: "dealer" },
    { actorId: "dealer-gamma", label: "Dealer gamma", role: "dealer" },
    { actorId: "dealer-outsider", label: "Unauthorized dealer", role: "dealer" }
  ]
};

const getStorageKey = (role: DemoRole): string => `${storageKeyPrefix}.${role}`;

export const resolveSession = (
  role: DemoRole,
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
  location: LocationLike | undefined
): DemoSession => {
  const actorFromUrl =
    location === undefined ? null : new URLSearchParams(location.search).get("actorId");

  if (actorFromUrl !== null && actorFromUrl.trim() !== "") {
    const session = {
      actorId: actorFromUrl,
      role
    } satisfies DemoSession;

    storage?.setItem(getStorageKey(role), JSON.stringify(session));

    return session;
  }

  const stored = storage?.getItem(getStorageKey(role));

  if (stored !== null && stored !== undefined) {
    try {
      const parsed = JSON.parse(stored) as Partial<DemoSession>;

      if (
        parsed.role === role &&
        typeof parsed.actorId === "string" &&
        parsed.actorId.trim() !== ""
      ) {
        return {
          actorId: parsed.actorId,
          role
        };
      }
    } catch {
      // Ignore malformed storage and fall through to defaults.
    }
  }

  const defaultIdentity = demoIdentities[role][0];

  if (defaultIdentity === undefined) {
    throw new Error(`No demo identities are configured for role ${role}.`);
  }

  return {
    actorId: defaultIdentity.actorId,
    role
  };
};

export const saveSession = (
  session: DemoSession,
  storage: Pick<Storage, "setItem"> | undefined
): DemoSession => {
  storage?.setItem(getStorageKey(session.role), JSON.stringify(session));

  return session;
};

export const resolvePairId = (fallbackPairId: string, location: LocationLike | undefined): string =>
  new URLSearchParams(location?.search ?? "").get("pairId") ?? fallbackPairId;

export const buildRoleUrl = (input: {
  actorId: string;
  pairId: string;
  role: DemoRole;
}): string => {
  const origin = frontendOrigins[input.role];
  const params = new URLSearchParams({
    actorId: input.actorId,
    pairId: input.pairId
  });

  return `${origin}/?${params.toString()}`;
};
