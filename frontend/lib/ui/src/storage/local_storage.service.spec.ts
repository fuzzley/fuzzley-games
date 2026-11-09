import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "../testing";
import { BROWSER_STORAGE } from "./browser_storage";
import { LocalStorageService } from "./local_storage.service";

/** A store that throws on every call, as a full or locked-down one does. */
class RefusingStorage implements Storage {
  readonly length = 0;

  clear(): void {
    throw new DOMException("refused", "SecurityError");
  }

  getItem(): string | null {
    throw new DOMException("refused", "SecurityError");
  }

  key(): string | null {
    throw new DOMException("refused", "SecurityError");
  }

  removeItem(): void {
    throw new DOMException("refused", "SecurityError");
  }

  setItem(): void {
    throw new DOMException("refused", "QuotaExceededError");
  }
}

describe("LocalStorageService", () => {
  let memory: MemoryStorage;

  beforeEach(() => {
    memory = new MemoryStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Returns the service, over the given store, or one in memory. */
  function service(storage?: Storage | null): LocalStorageService {
    TestBed.configureTestingModule({
      providers: [
        storage === undefined
          ? provideMemoryStorage(memory)
          : { provide: BROWSER_STORAGE, useValue: storage },
      ],
    });
    return TestBed.inject(LocalStorageService);
  }

  /** Silences the warnings a refusing store makes the service log. */
  function quietly(): void {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  }

  describe("strings", () => {
    it("reads back what it wrote", () => {
      const storage = service();

      storage.writeString("key", "value");

      expect(storage.readString("key")).toBe("value");
    });

    it("writes to the store it is given", () => {
      service().writeString("key", "value");

      expect(memory.getItem("key")).toBe("value");
    });

    it("reads an absent key as null", () => {
      expect(service().readString("missing")).toBeNull();
    });
  });

  describe("objects", () => {
    it("round-trips a value through JSON", () => {
      const storage = service();

      storage.writeObject("key", { a: 1, b: ["two"] });

      expect(storage.readObject("key")).toEqual({ a: 1, b: ["two"] });
    });

    it("reads unparseable JSON as null rather than throwing", () => {
      memory.setItem("key", "{ not json");
      quietly();

      expect(service().readObject("key")).toBeNull();
    });

    it("reads a stored non-object as null, since callers expect a shape", () => {
      memory.setItem("key", "42");

      expect(service().readObject("key")).toBeNull();
    });
  });

  describe("versioned objects", () => {
    it("reads back what it wrote, at the same version", () => {
      const storage = service();

      storage.writeVersioned("key", 2, { lives: 3 });

      expect(storage.readVersioned("key", 2)).toEqual({
        version: 2,
        lives: 3,
      });
    });

    it("stores the version beside the fields", () => {
      service().writeVersioned("key", 2, { lives: 3 });

      expect(JSON.parse(memory.getItem("key") ?? "")).toEqual({
        version: 2,
        lives: 3,
      });
    });

    it("stores its own version over one a value carries", () => {
      // @ts-expect-error A value with a version of its own is refused.
      service().writeVersioned("key", 2, { version: 9, lives: 3 });

      expect(JSON.parse(memory.getItem("key") ?? "")).toEqual({
        version: 2,
        lives: 3,
      });
    });

    it("reads another version as null", () => {
      const storage = service();
      storage.writeVersioned("key", 1, { lives: 3 });

      expect(storage.readVersioned("key", 2)).toBeNull();
    });

    it("reads an object stored with no version as null", () => {
      memory.setItem("key", JSON.stringify({ lives: 3 }));

      expect(service().readVersioned("key", 1)).toBeNull();
    });

    it("reads a stored list as null", () => {
      memory.setItem("key", "[1]");

      expect(service().readVersioned("key", 1)).toBeNull();
    });

    it("reads an absent key as null", () => {
      expect(service().readVersioned("missing", 1)).toBeNull();
    });
  });

  describe("removal", () => {
    it("forgets what was written", () => {
      const storage = service();
      storage.writeString("key", "value");

      storage.remove("key");

      expect(storage.readString("key")).toBeNull();
    });
  });

  describe("when the store refuses", () => {
    it("survives a write", () => {
      const storage = service(new RefusingStorage());
      quietly();

      expect(() => {
        storage.writeString("key", "value");
      }).not.toThrow();
    });

    it("reads null", () => {
      const storage = service(new RefusingStorage());
      quietly();

      expect(storage.readString("key")).toBeNull();
    });

    it("survives a removal", () => {
      const storage = service(new RefusingStorage());
      quietly();

      expect(() => {
        storage.remove("key");
      }).not.toThrow();
    });
  });

  describe("where there is no store", () => {
    it("reads null", () => {
      expect(service(null).readString("key")).toBeNull();
    });

    it("forgets what it was asked to write", () => {
      const storage = service(null);

      storage.writeString("key", "value");

      expect(storage.readString("key")).toBeNull();
    });
  });
});
