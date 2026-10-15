/** Best-effort: lets the Colab "Diagnostics" cell show browser-side errors from the server log. */
export function reportClientError(kind: string, err: unknown): void {
  try {
    const e = err as { message?: string; stack?: string } | undefined;
    const body = JSON.stringify({ kind, message: String(e?.message ?? err), stack: String(e?.stack ?? ''), url: location.href, ua: navigator.userAgent });
    navigator.sendBeacon?.('/api/client-log', new Blob([body], { type: 'application/json' }));
  } catch { /* never throw from the error reporter */ }
}
