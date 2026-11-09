import { TestBed } from "@angular/core/testing";
import { LocalStorageService } from "../storage";
import { MemoryStorage, provideMemoryStorage } from "./memory_storage";

// What JSON.stringify() gives for undefined: no string, though typed as one.
const UNDEFINED_JSON = JSON.stringify(undefined);

describe("MemoryStorage", () => {
  it("reads back what was stored", () => {
    const storage = new MemoryStorage();

    storage.setItem("key", "value");

    expect(storage.getItem("key")).toBe("value");
  });

  it("reads a key never stored as null", () => {
    expect(new MemoryStorage().getItem("key")).toBeNull();
  });

  it("forgets what was removed", () => {
    const storage = new MemoryStorage();
    storage.setItem("key", "value");

    storage.removeItem("key");

    expect(storage.getItem("key")).toBeNull();
  });

  it("forgets everything once cleared", () => {
    const storage = new MemoryStorage();
    storage.setItem("one", "1");
    storage.setItem("two", "2");

    storage.clear();

    expect(storage.length).toBe(0);
  });

  it("counts its keys and names each by its place", () => {
    const storage = new MemoryStorage();

    storage.setItem("one", "1");
    storage.setItem("two", "2");

    expect([storage.length, storage.key(0), storage.key(1)]).toEqual([
      2,
      "one",
      "two",
    ]);
  });

  it("names no key past its last", () => {
    expect(new MemoryStorage().key(0)).toBeNull();
  });

  describe("as the browser's, turning what it is handed into strings", () => {
    it("stores a value as its string", () => {
      const storage = new MemoryStorage();

      storage.setItem("key", UNDEFINED_JSON);

      expect(storage.getItem("key")).toBe("undefined");
    });

    it("stores under a key's string", () => {
      const storage = new MemoryStorage();

      storage.setItem(UNDEFINED_JSON, "value");

      expect(storage.getItem("undefined")).toBe("value");
    });

    it("reads by a key's string", () => {
      const storage = new MemoryStorage();
      storage.setItem("undefined", "value");

      expect(storage.getItem(UNDEFINED_JSON)).toBe("value");
    });

    it("removes by a key's string", () => {
      const storage = new MemoryStorage();
      storage.setItem("undefined", "value");

      storage.removeItem(UNDEFINED_JSON);

      expect(storage.getItem("undefined")).toBeNull();
    });
  });
});

describe("provideMemoryStorage", () => {
  it("gives the app the store a spec holds", () => {
    const storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });

    TestBed.inject(LocalStorageService).writeString("key", "value");

    expect([storage.getItem("key"), localStorage.getItem("key")]).toEqual([
      "value",
      null,
    ]);
  });

  it("gives each app a store of its own where a spec holds none", () => {
    TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });
    TestBed.inject(LocalStorageService).writeString("key", "value");
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });

    expect(TestBed.inject(LocalStorageService).readString("key")).toBeNull();
  });

  it("gives the next visit back what the store kept", () => {
    const storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });
    TestBed.inject(LocalStorageService).writeString("key", "value");
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });

    expect(TestBed.inject(LocalStorageService).readString("key")).toBe("value");
  });
});
