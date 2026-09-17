import { parseGravityQuery } from "./api-query";
import { corsHeaders, optionsOk } from "./cors";
import { EXPORT_SCHEMA, exportFilename, packExport, snapshotToCsv } from "./export-gdi";

export type ExportFormat = "json" | "csv" | "schema" | "raw";

export function parseExportFormat(url: URL, fallback: ExportFormat): ExportFormat {
  const raw = (url.searchParams.get("format") ?? "").toLowerCase();
  if (raw === "csv") return "csv";
  if (raw === "schema") return "schema";
  if (raw === "json" || raw === "export") return "json";
  if (raw === "raw") return "raw";
  return fallback;
}

export async function handleGdiRead(request: Request, fallback: ExportFormat): Promise<Response> {
  if ((request.method ?? "GET").toUpperCase() === "OPTIONS") return optionsOk();
  const url = new URL(request.url);
  const format = parseExportFormat(url, fallback);
  if (format === "schema") {
    return Response.json(EXPORT_SCHEMA, {
      headers: corsHeaders({ "Content-Type": "application/json; charset=utf-8" }),
    });
  }
  const { loadGravity } = await import("./venues");
  const data = await loadGravity(parseGravityQuery(url));
  if (format === "csv") {
    return new Response(snapshotToCsv(data), {
      headers: corsHeaders({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFilename(data, "csv")}"`,
        "Cache-Control": "public, max-age=10",
      }),
    });
  }
  if (format === "json") {
    const download = url.searchParams.get("download") === "1";
    const headers = corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=10",
    });
    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${exportFilename(data, "json")}"`);
    }
    return Response.json(packExport(data), { headers });
  }
  return Response.json(data, {
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=10",
    }),
  });
}
