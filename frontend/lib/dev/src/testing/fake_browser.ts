import type { DevToolsSocket } from "../chrome.ts";

/** A command a {@link FakeBrowser} was sent. */
export interface Command {
  readonly id: number;
  readonly method: string;
  readonly params: Record<string, unknown>;
  readonly sessionId?: string;
}

/** What a {@link FakeBrowser} answers a command with. */
export type Answer = { readonly result: unknown } | { readonly error: string };

/** Answers a command, or works out the answer from it. */
export type Reply = Answer | ((command: Command) => Answer);

/**
 * Stands in for Chrome's end of a DevTools socket: it answers each command
 * from a table, by its method, and fires a page's load event after a
 * navigation or a reload. Another event is sent with {@link emit}.
 */
export class FakeBrowser implements DevToolsSocket {
  readonly sent: Command[] = [];
  closed = false;
  private readonly answers: Readonly<Record<string, Reply>>;
  private listener: ((event: { readonly data: unknown }) => void) | undefined;

  constructor(answers: Readonly<Record<string, Reply>> = {}) {
    this.answers = {
      "Target.createBrowserContext": { result: { browserContextId: "ctx" } },
      "Target.createTarget": { result: { targetId: "target" } },
      "Target.attachToTarget": { result: { sessionId: "page" } },
      "Runtime.evaluate": { result: { result: {} } },
      ...answers,
    };
  }

  addEventListener(
    _type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void {
    this.listener = listener;
  }

  send(data: string): void {
    const command = JSON.parse(data) as Command;
    this.sent.push(command);
    queueMicrotask(() => {
      const reply = this.answers[command.method] ?? { result: {} };
      const answer = typeof reply === "function" ? reply(command) : reply;
      this.emit({ id: command.id, ...asMessage(answer) });
      if (
        command.method === "Page.navigate" ||
        command.method === "Page.reload"
      ) {
        this.emit({
          method: "Page.loadEventFired",
          sessionId: command.sessionId,
        });
      }
    });
  }

  close(): void {
    this.closed = true;
  }

  /** Sends a message to the connection, as Chrome does. */
  emit(message: object): void {
    this.listener?.({ data: JSON.stringify(message) });
  }

  /** Returns the methods sent, in order. */
  methods(): string[] {
    return this.sent.map((command) => command.method);
  }

  /** Returns the last command of a method. */
  last(method: string): Command | undefined {
    return this.sent.findLast((command) => command.method === method);
  }
}

/** Returns an answer as the reply DevTools sends. */
function asMessage(answer: Answer): object {
  return "error" in answer
    ? { error: { message: answer.error } }
    : { result: answer.result };
}

/** A viewport for the pages the specs open. */
export const VIEWPORT = { width: 800, height: 600, deviceScaleFactor: 2 };
