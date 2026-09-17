import { createFileRoute } from "@tanstack/react-router";
import { Terminal } from "@/components/terminal";
import { getGravity, getVenueCatalog } from "@/lib/market.functions";
import { bootScript } from "@/lib/query-gravity";
import type { PitId } from "@/lib/types";

export const Route = createFileRoute("/")({
  loader: async () => {
    const catalog = await getVenueCatalog();
    const snapshot = await getGravity({
      data: {
        symbol: "BTC",
        interval: catalog.default.interval,
        window: catalog.default.window,
        venue: catalog.default.venue as PitId,
      },
    });
    return { snapshot, catalog };
  },
  staleTime: 60_000,
  head: ({ loaderData }) => ({
    scripts: loaderData?.snapshot ? [{ children: bootScript(loaderData.snapshot) }] : [],
  }),
  component: Home,
});

function Home() {
  const { snapshot, catalog } = Route.useLoaderData();
  return (
    <main>
      <Terminal initial={snapshot} catalog={catalog} />
    </main>
  );
}
