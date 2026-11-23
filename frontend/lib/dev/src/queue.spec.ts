import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MARK_MS,
  type QueueIo,
  STALE_MS,
  queueFolder,
  waitInQueue,
} from "./queue.ts";

/** Folders made for a spec, removed after it. */
const made: string[] = [];

afterEach(async () => {
  await Promise.all(
    made
      .splice(0)
      .map((folder) =>
        rm(folder, { recursive: true, force: true, maxRetries: 10 }),
      ),
  );
});

/** Returns a queue's folder, not yet made, in a folder of a spec's own. */
async function freshQueue(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "fz-queue-"));
  made.push(folder);
  return join(folder, "queue");
}

/**
 * Stands in for the time a queue's runs read and wait by: a clock a spec
 * sets, a sleep that runs the next of a spec's steps rather than waiting,
 * and the functions the runs asked to have called regularly.
 */
interface Scripted {
  /** The time the clock reads, in milliseconds since 1970. */
  time: number;
  /** What a waiting run hears of the runs ahead of it, in order. */
  readonly heard: number[];
  /** What the runs asked to have called regularly, and haven't stopped. */
  readonly regular: Set<() => void>;
  /** The clock, the sleep and the rest, for a run that joins. */
  readonly io: QueueIo;
}

/** Returns a stand-in whose sleep runs each of the steps in turn, and rejects once none are left. */
function scripted(...steps: (() => void)[]): Scripted {
  const left = [...steps];
  const stage: Scripted = {
    time: 1_800_000_000_000,
    heard: [],
    regular: new Set(),
    io: {
      now: () => stage.time,
      sleep: () => {
        const step = left.shift();
        if (step === undefined) {
          return Promise.reject(new Error("Still waiting"));
        }
        step();
        return Promise.resolve();
      },
      every: (_ms, run) => {
        stage.regular.add(run);
        return () => stage.regular.delete(run);
      },
      onWait: (ahead) => stage.heard.push(ahead),
    },
  };
  return stage;
}

describe("waitInQueue", () => {
  it("goes at once where no run is ahead, making the folder and keeping a place in it", async () => {
    const folder = await freshQueue();

    await waitInQueue(folder, scripted().io);

    expect(await readdir(folder)).toHaveLength(1);
  });

  it("leaves no place behind once it leaves", async () => {
    const folder = await freshQueue();
    const leave = await waitInQueue(folder, scripted().io);

    leave();

    expect(await readdir(folder)).toEqual([]);
  });

  it("waits for a run that joined before it, until that one leaves", async () => {
    const folder = await freshQueue();
    const first = scripted();
    const leaveFirst = await waitInQueue(folder, first.io);
    const order: string[] = [];
    const second = scripted(
      () => order.push("second waits"),
      () => {
        order.push("first leaves");
        leaveFirst();
      },
    );
    second.time = first.time + 1;

    await waitInQueue(folder, second.io);
    order.push("second goes");

    expect(order).toEqual(["second waits", "first leaves", "second goes"]);
  });

  it("goes in the order the runs joined, whichever looks first", async () => {
    const folder = await freshQueue();
    const first = scripted();
    const leaveFirst = await waitInQueue(folder, first.io);
    const second = scripted();
    second.time = first.time + 1;
    const third = scripted(leaveFirst);
    third.time = first.time + 2;

    const thirdWent = waitInQueue(folder, third.io).then(
      () => true,
      () => false,
    );
    const secondWent = waitInQueue(folder, second.io).then(
      () => true,
      () => false,
    );

    expect(await Promise.all([secondWent, thirdWent])).toEqual([true, false]);
  });

  it("says how many runs are ahead as it starts to wait, and each time that changes", async () => {
    const folder = await freshQueue();
    const first = scripted();
    const leaveFirst = await waitInQueue(folder, first.io);
    const before = scripted();
    before.time = first.time - 1;
    const leaveBefore = await waitInQueue(folder, before.io);
    const last = scripted(
      () => undefined,
      leaveFirst,
      () => undefined,
      leaveBefore,
    );
    last.time = first.time + 1;

    await waitInQueue(folder, last.io);

    expect(last.heard).toEqual([2, 1]);
  });

  it("passes over a place not marked for a minute, and removes it", async () => {
    const folder = await freshQueue();
    const killed = scripted();
    await waitInQueue(folder, killed.io);
    const next = scripted();
    next.time = killed.time + STALE_MS + 1;

    await waitInQueue(folder, next.io);

    expect({ heard: next.heard, places: await readdir(folder) }).toEqual({
      heard: [],
      places: [expect.stringContaining(String(next.time))],
    });
  });

  it("passes over no place on a look that finds the clock has jumped, until the next", async () => {
    const folder = await freshQueue();
    const asleep = scripted();
    await waitInQueue(folder, asleep.io);
    const order: string[] = [];
    const next = scripted(
      () => {
        order.push("waits");
        next.time += STALE_MS * 2;
      },
      () => order.push("waits on waking"),
    );
    next.time = asleep.time + 1;

    await waitInQueue(folder, next.io);
    order.push("goes");

    expect(order).toEqual(["waits", "waits on waking", "goes"]);
  });

  it("waits for a place marked within the minute", async () => {
    const folder = await freshQueue();
    const first = scripted();
    await waitInQueue(folder, first.io);
    const next = scripted();
    next.time = first.time + STALE_MS;

    const waited = waitInQueue(folder, next.io);

    await expect(waited).rejects.toThrow("Still waiting");
  });

  it("marks its place again each time it is asked to, so a long run isn't passed over", async () => {
    const folder = await freshQueue();
    const long = scripted();
    await waitInQueue(folder, long.io);
    long.time += STALE_MS;
    for (const mark of long.regular) mark();
    const next = scripted();
    next.time = long.time + STALE_MS;

    const waited = waitInQueue(folder, next.io);

    await expect(waited).rejects.toThrow("Still waiting");
  });

  it("asks to mark its place more often than a place goes stale, and stops once it leaves", async () => {
    const folder = await freshQueue();
    const stage = scripted();
    const asked: number[] = [];
    const leave = await waitInQueue(folder, {
      ...stage.io,
      every: (ms, run) => {
        asked.push(ms);
        return stage.io.every?.(ms, run) ?? (() => undefined);
      },
    });

    leave();

    expect({ asked, left: stage.regular.size }).toEqual({
      asked: [MARK_MS],
      left: 0,
    });
    expect(MARK_MS * 4).toBeLessThan(STALE_MS);
  });

  it("takes its place back where another run removed it as stale", async () => {
    const folder = await freshQueue();
    const slept = scripted();
    await waitInQueue(folder, slept.io);
    const [place = ""] = await readdir(folder);
    await rm(join(folder, place));

    for (const mark of slept.regular) mark();

    expect(await readdir(folder)).toEqual([place]);
  });

  it("carries on where a mark fails, as the next may not", async () => {
    const folder = await freshQueue();
    const stage = scripted();
    await waitInQueue(folder, stage.io);
    await rm(folder, { recursive: true });
    await writeFile(folder, "no folder");

    const marks = (): void => {
      for (const mark of stage.regular) mark();
    };

    expect(marks).not.toThrow();
  });

  it("leaves the queue where its wait fails", async () => {
    const folder = await freshQueue();
    const first = scripted();
    await waitInQueue(folder, first.io);
    const [place = ""] = await readdir(folder);
    const next = scripted();
    next.time = first.time + 1;

    await waitInQueue(folder, next.io).catch(() => undefined);

    expect({
      places: await readdir(folder),
      marking: next.regular.size,
    }).toEqual({ places: [place], marking: 0 });
  });

  it("waits by the clock and a timer of its own unless handed others", async () => {
    const folder = await freshQueue();

    const leave = await waitInQueue(folder);
    leave();

    expect(await readdir(folder)).toEqual([]);
  });
});

describe("queueFolder", () => {
  /** Returns the real path of a repository of one commit, in a folder of a spec's own. */
  async function repository(): Promise<string> {
    const top = await mkdtemp(join(tmpdir(), "fz-queue-repo-"));
    made.push(top);
    execFileSync("git", ["init", "--quiet"], { cwd: top });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Spec",
        "-c",
        "user.email=spec@example.com",
        "commit",
        "--quiet",
        "--allow-empty",
        "--message",
        "Start",
      ],
      { cwd: top },
    );
    return realpathSync.native(top);
  }

  it("finds the queue in the folder git keeps, from a folder below the top", async () => {
    const top = await repository();
    await mkdir(join(top, "frontend"));

    expect(await queueFolder(join(top, "frontend"))).toBe(
      join(top, ".git", "fz-verify-queue"),
    );
  });

  it("finds the same queue from each of a repository's worktrees", async () => {
    const top = await repository();
    execFileSync(
      "git",
      ["worktree", "add", "--quiet", "--detach", join(top, "other")],
      { cwd: top },
    );

    expect(await queueFolder(join(top, "other"))).toBe(await queueFolder(top));
  });

  it("rejects for a folder in no repository", async () => {
    const folder = await mkdtemp(join(tmpdir(), "fz-queue-none-"));
    made.push(folder);

    await expect(queueFolder(folder)).rejects.toThrow("not a git repository");
  });
});
