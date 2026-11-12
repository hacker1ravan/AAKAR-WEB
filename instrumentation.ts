// Next.js calls this for every unexpected server error (failed pages and API routes).
// The Node.js check must be written this way so the Edge build skips the Node-only code.
export async function onRequestError(err: unknown, request: { path: string; method: string }) {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportError } = await import("./lib/monitor");
    await reportError(err, `${request.method} ${request.path}`);
  }
}
