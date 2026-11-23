import { loadsSettled } from "./settled";

describe("loadsSettled", () => {
  it("waits for a load that lands after the page first settles, and the page to settle after it", async () => {
    const seen: string[] = [];
    let settles = 0;
    const page = {
      whenStable: (): Promise<void> => {
        settles += 1;
        if (settles === 1) {
          setTimeout(() => {
            void Promise.resolve().then(() => seen.push("loaded"));
          });
        }
        return Promise.resolve();
      },
    };

    await loadsSettled(page);

    expect([seen, settles]).toEqual([["loaded"], 2]);
  });
});
