import { createFileRoute } from "@tanstack/react-router";
import { Terminal } from "@/components/terminal";
import { getGravity } from "@/lib/market.functions";
import { bootScript } from "@/lib/query-gravity";

export const Route = createFileRoute("/")({
  loader: () => getGravity({ data: { symbol: "BTC", interval: "5m", window: 48 } }),
  staleTime: 60_000,
  head: ({ loaderData }) => ({
    scripts: loaderData ? [{ children: bootScript(loaderData) }] : [],
  }),
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  return (
    <main>
      <Terminal initial={initial} />
    </main>
  );
}
