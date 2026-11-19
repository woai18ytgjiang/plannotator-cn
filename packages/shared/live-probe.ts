/**
 * Shared live-app eligibility probe for annotate URL targets.
 *
 * One implementation of the "does this loopback URL front a live dev app?"
 * decision, used by the Bun CLI's annotate resolution
 * (apps/hook/server/annotate-resolution.ts) and the Pi extension's annotate
 * command (vendored to generated/). Both hosts must probe identically: same
 * 3s timeout, same `accept: text/html` request, same "any status < 500"
 * gate, same final-response redirect rule — a drifting copy here would make
 * the same URL open live on one agent and static on another.
 *
 * Pure Web-platform code: global fetch + AbortSignal.timeout, no Bun or
 * node:http APIs.
 */

import { isLoopbackHostname, isPlannotatorLiveTarget, isPlannotatorUpstreamResponse } from "./live-proxy-core";

export const LIVE_PROBE_TIMEOUT_MS = 3000;
/** Redirects the probe follows, each on the target's own loopback origin. */
export const LIVE_PROBE_MAX_REDIRECTS = 5;

export interface LiveAppCandidate {
  parsed: URL | null;
  /** The URL parsed and its hostname is loopback (localhost / ::1 / 127/8). */
  loopback: boolean;
}

/** Parse an annotate URL target and classify its live-mode candidacy. */
export function classifyLiveAppCandidate(url: string): LiveAppCandidate {
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  return { parsed, loopback: parsed !== null && isLoopbackHostname(parsed.hostname) };
}

export interface LiveAppProbeResult {
  liveEligible: boolean;
  /** Fetch-level failure message, when the probe never completed. */
  probeError: string | null;
  /** Final URL when the probe redirected off the target's loopback origin. */
  probeRedirectedTo: string | null;
  /**
   * The target is a Plannotator server (a port a Plannotator registry names,
   * or a response carrying the Plannotator server header). Never live: the
   * proxy would give the proxied page same-origin writes on that server.
   */
  plannotator: boolean;
}

export interface LiveAppProbeOptions {
  /** Ports Plannotator servers hold (listPlannotatorServerPorts); refused before any request. */
  plannotatorPorts?: Iterable<number>;
}

/**
 * Probe a loopback http URL for live eligibility. Live eligibility is judged
 * on the FINAL response after redirects: a loopback URL that 302s off its
 * own origin (auth portal, tunnel splash page, another local service) must
 * not open a live session whose iframe immediately navigates off the proxy;
 * same-server redirects (/ to /login) stay live-eligible. Each redirect is
 * judged before it is followed (`redirect: "manual"`, at most
 * LIVE_PROBE_MAX_REDIRECTS): one off the origin ends the probe without a
 * request to it. Any status < 500 with an HTML content type qualifies, so a
 * login page or SPA 404 still opens live.
 */
export async function probeLiveAppTarget(
  targetUrl: string,
  parsedUrl: URL,
  fetchImpl: typeof fetch = fetch,
  options: LiveAppProbeOptions = {},
): Promise<LiveAppProbeResult> {
  if (isPlannotatorLiveTarget(parsedUrl, options.plannotatorPorts ?? [])) {
    return { liveEligible: false, probeError: null, probeRedirectedTo: null, plannotator: true };
  }
  let plannotator = false;
  let liveEligible = false;
  let probeError: string | null = null;
  let probeRedirectedTo: string | null = null;
  const onOrigin = (url: URL) =>
    url.protocol === "http:" && isLoopbackHostname(url.hostname) && (url.port || "80") === (parsedUrl.port || "80");
  try {
    // Redirects are followed by hand, each judged BEFORE it is fetched: only
    // one that stays on the target's loopback origin is followed, so the probe
    // never sends a request to another local service (or a Plannotator server).
    const signal = AbortSignal.timeout(LIVE_PROBE_TIMEOUT_MS);
    let url = targetUrl;
    let probe: Response | null = null;
    for (let hop = 0; hop <= LIVE_PROBE_MAX_REDIRECTS; hop += 1) {
      const response = await fetchImpl(url, { headers: { accept: "text/html" }, redirect: "manual", signal });
      const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
      if (location === null) {
        probe = response;
        break;
      }
      await response.body?.cancel().catch(() => {});
      let next: URL | null = null;
      try {
        next = new URL(location, url);
      } catch {
        next = null;
      }
      if (!next || !onOrigin(next)) {
        probeRedirectedTo = next ? next.href : location;
        break;
      }
      url = next.href;
    }
    if (probe) {
      const contentType = probe.headers.get("content-type") ?? "";
      plannotator = isPlannotatorUpstreamResponse(probe.headers);
      liveEligible = !plannotator && probe.status < 500 && contentType.includes("text/html");
    } else if (probeRedirectedTo === null) {
      probeError = `more than ${LIVE_PROBE_MAX_REDIRECTS} redirects`;
    }
  } catch (err) {
    probeError = err instanceof Error ? err.message : String(err);
  }
  return { liveEligible, probeError, probeRedirectedTo, plannotator };
}

// --- Shared user-facing messages ---------------------------------------------
// Wording is shared so a Pi user and a CLI user read the SAME explanation for
// the same condition; hosts differ only in the channel (stderr vs notify).

/** --app given with a file/folder target. */
export const LIVE_APP_REQUIRES_URL_MESSAGE =
  "--app 需要一个 URL 目标（正在运行的本地应用，例如 http://localhost:5173）";

/** --app given with a non-loopback URL. */
export const LIVE_APP_REQUIRES_LOOPBACK_MESSAGE = "--app 需要 localhost/回环地址的 URL";

/** --app given with an https URL (the live proxy is http-only). */
export const LIVE_APP_REQUIRES_HTTP_MESSAGE =
  "--app 需要 http:// URL（实时应用代理不支持 https 上游）";

/** Live sessions are hard-off in remote mode; no override env var exists. */
export const LIVE_APP_REMOTE_MESSAGE =
  "远程模式（PLANNOTATOR_REMOTE）下无法使用实时应用批注。请在本地运行，或使用 --static 批注页面的转换快照。";

/** The --app forced-live failure, keyed on what the probe found. */
export function buildForceAppFailureMessage(
  targetUrl: string,
  probe: LiveAppProbeResult,
): string {
  if (probe.plannotator) {
    return `--app：${targetUrl} 是 Plannotator 服务器；实时批注从不会代理 Plannotator 服务器，因为被代理的页面会获得对它的同源访问权限`;
  }
  if (probe.probeError !== null) {
    return `--app：无法访问 ${targetUrl}：${probe.probeError}`;
  }
  if (probe.probeRedirectedTo !== null) {
    return `--app：${targetUrl} 重定向离开了它的回环源（${probe.probeRedirectedTo}）；实时模式要求应用从被探测的源提供 HTML`;
  }
  return `--app：${targetUrl} 没有返回 HTML 页面`;
}

/**
 * Fallback notice when the target is a Plannotator server: live mode never
 * proxies one, so the session degrades to static conversion and says why.
 */
export function buildLivePlannotatorFallbackNotice(targetUrl: string): string {
  return `${targetUrl} 是 Plannotator 服务器，实时批注从不会代理它；改用静态转换。`;
}

/**
 * Fallback notice when a live-eligible-looking URL probed as unreachable and
 * the session degrades to static conversion. A dev server still starting up
 * probes as unreachable, and a silent downgrade to static conversion reads
 * as a broken live session, so the notice names the condition and the
 * retry-with---app escape hatch.
 */
export function buildLiveProbeFallbackNotice(targetUrl: string, probeError: string): string {
  return (
    `对 ${targetUrl} 的实时探测失败（${probeError}）；改用静态转换。`
    + `如果开发服务器仍在启动中，请用 --app 重试以强制使用实时模式。`
  );
}
