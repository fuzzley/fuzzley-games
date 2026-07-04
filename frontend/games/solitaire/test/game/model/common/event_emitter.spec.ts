import { EventEmitter } from "@/game/model/common/event_emitter";

interface MockEvents {
  "test-event": { payload: string };
  "void-event": void;
}

class TestEmitter extends EventEmitter<MockEvents> {
  public triggerTest(payload: string) {
    this.emit("test-event", { payload });
  }

  public triggerVoid() {
    this.emit("void-event", undefined);
  }
}

describe("EventEmitter", () => {
  it("subscribes and fires events with payload data", () => {
    const emitter = new TestEmitter();
    const mockCallback = vi.fn();

    emitter.on("test-event", mockCallback);
    emitter.triggerTest("hello");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({ payload: "hello" });
  });

  it("unsubscribes listeners correctly", () => {
    const emitter = new TestEmitter();
    const mockCallback = vi.fn();

    emitter.on("test-event", mockCallback);
    emitter.off("test-event", mockCallback);
    emitter.triggerTest("hello");

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("handles void events correctly", () => {
    const emitter = new TestEmitter();
    const mockCallback = vi.fn();

    emitter.on("void-event", mockCallback);
    emitter.triggerVoid();

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("supports multiple subscribers for the same event", () => {
    const emitter = new TestEmitter();
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();

    emitter.on("test-event", mockCallback1);
    emitter.on("test-event", mockCallback2);
    emitter.triggerTest("multiple");

    expect(mockCallback1).toHaveBeenCalledWith({ payload: "multiple" });
    expect(mockCallback2).toHaveBeenCalledWith({ payload: "multiple" });
  });

  it("does not crash when unsubscribing from an event with no listeners", () => {
    const emitter = new TestEmitter();
    const mockCallback = vi.fn();

    expect(() => emitter.off("test-event", mockCallback)).not.toThrow();
  });

  it("does not crash when emitting an event with no listeners", () => {
    const emitter = new TestEmitter();

    expect(() => emitter.triggerTest("silent")).not.toThrow();
  });
});
