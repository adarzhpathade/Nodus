// FROZEN — picks the mock or real implementation per feature.
// MOCK_FEATURES=all            → every feature uses mocks
// MOCK_FEATURES=graph,ai       → only those features use mocks
// MOCK_FEATURES= (empty/unset) → everything is real
import "server-only";
import { FEATURES, type Feature, type NodusGateway } from "@/contracts/gateway";
import { mockGateway } from "@/mocks/gateway";
import { serverGateway } from "@/lib/server-gateway";

function mockedFeatures(): Set<Feature> {
  const raw = (process.env.MOCK_FEATURES ?? "").trim();
  if (raw === "all") return new Set(FEATURES);

  const known = new Set<string>(FEATURES);
  return new Set(
    raw
      .split(",")
      .map((name) => name.trim())
      .filter((name): name is Feature => known.has(name)),
  );
}

export function isMocked(feature: Feature): boolean {
  return mockedFeatures().has(feature);
}

export function getGateway(): NodusGateway {
  const mocked = mockedFeatures();
  const gateway = {} as Record<Feature, unknown>;
  for (const feature of FEATURES) {
    gateway[feature] = mocked.has(feature) ? mockGateway[feature] : serverGateway[feature];
  }
  return gateway as NodusGateway;
}
