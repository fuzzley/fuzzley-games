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

/**
 * Answers a command, or works out the answer from it, at once or, as a
 * promise, once it settles.
 */
export type Reply = Answer | ((command: Command) => Answer | Promise<Answer>);

/**
 * Stands in for Chrome's end of a DevTools socket: it answers each command
 * from a table, by its method, and fires a page's load event after a
 * navigation or a reload. Another event is sent with {@link emit}. Unless
 * told otherwise, it numbers the contexts, targets and sessions it makes, in
 * the order it makes them: `ctx-1`, `target-1` and `page-1` first.
 */
export class FakeBrowser implements DevToolsSocket {
  readonly sent: Command[] = [];
  closed = false;
  private readonly answers: Readonly<Record<string, Reply>>;
  /**
   * Each context opened, as 1, and closed, as -1, in turn: open from the
   * command that creates it till the answer to the one that disposes of it.
   */
  private readonly contextChanges: number[] = [];
  private listener: ((event: { readonly data: unknown }) => void) | undefined;

  constructor(answers: Readonly<Record<string, Reply>> = {}) {
    const numbered = (prefix: string, key: string): Reply => {
      let made = 0;
      return () => ({ result: { [key]: `${prefix}-${String((made += 1))}` } });
    };
    this.answers = {
      "Target.createBrowserContext": numbered("ctx", "browserContextId"),
      "Target.createTarget": numbered("target", "targetId"),
      "Target.attachToTarget": numbered("page", "sessionId"),
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
    if (command.method === "Target.createBrowserContext") {
      this.contextChanges.push(1);
    }
    queueMicrotask(() => {
      const reply = this.answers[command.method] ?? { result: {} };
      const answer = typeof reply === "function" ? reply(command) : reply;
      if (answer instanceof Promise) {
        void answer.then((settled) => {
          this.answer(command, settled);
        });
      } else {
        this.answer(command, answer);
      }
    });
  }

  /** Sends a command's answer, and the load event a navigation fires. */
  private answer(command: Command, answer: Answer): void {
    if (command.method === "Target.disposeBrowserContext") {
      this.contextChanges.push(-1);
    }
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

  /**
   * Returns how many browser contexts are open, each from the command that
   * creates it till it answers the one that disposes of it.
   */
  contextsOpen(): number {
    return this.contextsOpenAfterEach().at(-1) ?? 0;
  }

  /**
   * Returns the most browser contexts that were open at once, each from the
   * command that creates it till it answers the one that disposes of it.
   */
  mostContextsOpen(): number {
    return Math.max(0, ...this.contextsOpenAfterEach());
  }

  /** Returns how many browser contexts were open after each change. */
  private contextsOpenAfterEach(): number[] {
    let open = 0;
    return this.contextChanges.map((change) => (open += change));
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
