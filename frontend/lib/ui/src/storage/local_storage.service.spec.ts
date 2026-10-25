import { TestBed } from "@angular/core/testing";
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
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Returns the service, over the given store if there is one. */
  function service(storage?: Storage | null): LocalStorageService {
    if (storage !== undefined) {
      TestBed.configureTestingModule({
        providers: [{ provide: BROWSER_STORAGE, useValue: storage }],
      });
    }
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

    it("writes to the browser's local storage", () => {
      service().writeString("key", "value");

      expect(localStorage.getItem("key")).toBe("value");
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
      localStorage.setItem("key", "{ not json");
      quietly();

      expect(service().readObject("key")).toBeNull();
    });

    it("reads a stored non-object as null, since callers expect a shape", () => {
      localStorage.setItem("key", "42");

      expect(service().readObject("key")).toBeNull();
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
