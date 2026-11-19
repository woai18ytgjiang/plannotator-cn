import { parsePortSelection, type ParsedPortSelection } from "./port-range";

/** Live proxies never inherit the editor's remote-mode port or bind address. */
export function getLiveProxyPortSelection(): ParsedPortSelection {
  const value = process.env.PLANNOTATOR_LIVE_PORT;
  if (value) {
    const parsed = parsePortSelection(value);
    if (parsed) return parsed;
    console.error(`[Plannotator] Warning: Invalid PLANNOTATOR_LIVE_PORT "${value}", using default`);
  }
  return { kind: "fixed", ports: [0] };
}

/** The error code a failed listen carries (`EADDRINUSE`, `EACCES`, ...), if any. */
export function listenErrorCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && code) return code;
  if (error.message.includes("EADDRINUSE")) return "EADDRINUSE";
  return null;
}

/**
 * Codes a range moves past, trying the next port: the port is taken
 * (EADDRINUSE) or this user may not bind it (EACCES, a port below 1024 when
 * not root). Any other code ends the attempt with a clear error.
 */
const SKIPPABLE_CODES = new Set(["EADDRINUSE", "EACCES"]);

const CODE_HINTS: Record<string, string> = {
  EACCES: "权限不足",
  EADDRINUSE: "已被占用",
  EADDRNOTAVAIL: "地址不可用",
};

function codeText(code: string): string {
  const hint = CODE_HINTS[code];
  return hint ? `${code}: ${hint}` : code;
}

/**
 * A live app proxy that could not bind any port PLANNOTATOR_LIVE_PORT allows.
 * The message is one line, written for the person who set the variable. The
 * CLI prints it as a startup failure without a stack trace.
 */
export class LiveProxyPortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LiveProxyPortError";
  }
}

/** Every port the selection allows is taken. */
export class LiveProxyPortInUseError extends LiveProxyPortError {
  constructor(selection: ParsedPortSelection) {
    const detail = selection.kind === "range"
      ? `PLANNOTATOR_LIVE_PORT 范围 ${selection.ports[0]}-${selection.ports.at(-1)} 内的每个端口都已被占用`
      : `端口 ${selection.ports[0]}（PLANNOTATOR_LIVE_PORT）已被占用`;
    super(`Plannotator：实时应用代理无法启动，${detail}。请关闭另一个实时批注会话，或将 PLANNOTATOR_LIVE_PORT 设为其他端口或端口范围。`);
    this.name = "LiveProxyPortInUseError";
  }
}

const NEXT_STEP = "请将 PLANNOTATOR_LIVE_PORT 设为其他端口或端口范围。";

function nextStep(failures: ReadonlyArray<{ port: number; code: string }>): string {
  const lowPortDenied = failures.some((f) => f.code === "EACCES" && f.port > 0 && f.port < 1024);
  return lowPortDenied ? `1024 以下的端口通常需要 root 权限。${NEXT_STEP}` : NEXT_STEP;
}

function onePortFailure(port: number, code: string, next: string): string {
  const subject = port === 0
    ? "无法绑定回环端口"
    : `端口 ${port}（PLANNOTATOR_LIVE_PORT）无法使用`;
  return `Plannotator：实时应用代理${subject}（${codeText(code)}）。${next}`;
}

/**
 * The port loop both transports share. Call `failed(port, error)` for each
 * port that would not bind: it returns when the loop should try the next
 * port, and throws when it should stop (an unexpected code ends it with one
 * clear line; an error without a code is rethrown as it is, since that is a
 * bug, not a port problem). When the loop runs out, throw `exhausted()`.
 */
export function createLiveProxyPortAttempts(selection: ParsedPortSelection) {
  const failures: Array<{ port: number; code: string }> = [];
  return {
    failed(port: number, error: unknown): void {
      const code = listenErrorCode(error);
      if (code === null) throw error;
      if (SKIPPABLE_CODES.has(code)) {
        failures.push({ port, code });
        return;
      }
      throw new LiveProxyPortError(onePortFailure(port, code, nextStep([{ port, code }])));
    },
    exhausted(): LiveProxyPortError {
      if (failures.every((failure) => failure.code === "EADDRINUSE")) {
        return new LiveProxyPortInUseError(selection);
      }
      if (selection.kind === "fixed") {
        const { port, code } = failures[0]!;
        return new LiveProxyPortError(onePortFailure(port, code, nextStep(failures)));
      }
      const counts = new Map<string, number>();
      for (const { code } of failures) counts.set(code, (counts.get(code) ?? 0) + 1);
      const detail = [...counts]
        .map(([code, count]) => code === "EADDRINUSE" ? `${count} 个被占用` : `${count} 个${CODE_HINTS[code] ?? "失败"}（${code}）`)
        .join("，");
      return new LiveProxyPortError(
        `Plannotator：实时应用代理无法使用 PLANNOTATOR_LIVE_PORT 范围 ${selection.ports[0]}-${selection.ports.at(-1)} 中的任何端口（${detail}）。${nextStep(failures)}`,
      );
    },
  };
}
