import { EventEmitter } from "@/game/model/common/event_emitter";

// A type alias, not an interface: only object literal types satisfy the
// `Record<string, unknown>` constraint EventEmitter places on its event map.
type MockEvents = {
  "test-event": { payload: string };
  "void-event": undefined;
};

class TestEmitter extends EventEmitter<MockEvents> {
  public triggerTest(payload: string) {
    this.emit("test-event", { payload });
  }

  public triggerVoid() {
    this.emit("void-event", undefined);
  }
}

describe("EventEmitter", () => {
  it("delivers the emitted payload to a subscriber", () => {
    const emitter = new TestEmitter();
    const received: { payload: string }[] = [];
    emitter.on("test-event", (data) => received.push(data));

    emitter.triggerTest("hello");

    expect(received).toEqual([{ payload: "hello" }]);
  });

  it("stops delivering events after a listener is removed", () => {
    const emitter = new TestEmitter();
    const received: { payload: string }[] = [];
    const listener = (data: { payload: string }) => received.push(data);
    emitter.on("test-event", listener);
    emitter.off("test-event", listener);

    emitter.triggerTest("hello");

    expect(received).toEqual([]);
  });

  it("delivers void events to subscribers", () => {
    const emitter = new TestEmitter();
    let callCount = 0;
    emitter.on("void-event", () => callCount++);

    emitter.triggerVoid();

    expect(callCount).toBe(1);
  });

  it("delivers the payload to every subscriber of an event", () => {
    const emitter = new TestEmitter();
    const receivedByFirst: { payload: string }[] = [];
    const receivedBySecond: { payload: string }[] = [];
    emitter.on("test-event", (data) => receivedByFirst.push(data));
    emitter.on("test-event", (data) => receivedBySecond.push(data));

    emitter.triggerTest("multiple");

    expect(receivedByFirst).toEqual([{ payload: "multiple" }]);
    expect(receivedBySecond).toEqual([{ payload: "multiple" }]);
  });

  it("does not throw when unsubscribing from an event with no listeners", () => {
    const emitter = new TestEmitter();

    expect(() =>
      emitter.off("test-event", () => {
        /* no-op */
      }),
    ).not.toThrow();
  });

  it("does not throw when emitting an event with no listeners", () => {
    const emitter = new TestEmitter();

    expect(() => emitter.triggerTest("silent")).not.toThrow();
  });

  it("does not notify a listener that subscribes during an in-progress emit", () => {
    const emitter = new TestEmitter();
    let lateCalls = 0;
    emitter.on("test-event", () => {
      emitter.on("test-event", () => lateCalls++);
    });

    emitter.triggerTest("first");

    expect(lateCalls).toBe(0);
  });
});
