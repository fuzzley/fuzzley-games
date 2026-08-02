// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { LocalStorageService } from "@/ui/app/service/local_storage.service";

function buildStorage(): LocalStorageService {
  TestBed.configureTestingModule({});
  return TestBed.inject(LocalStorageService);
}

describe("LocalStorageService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("strings", () => {
    it("reads back what it wrote", () => {
      const storage = buildStorage();

      storage.writeString("key", "value");

      expect(storage.readString("key")).toBe("value");
    });

    it("reads an absent key as null", () => {
      expect(buildStorage().readString("missing")).toBeNull();
    });
  });

  describe("objects", () => {
    it("round-trips a value through JSON", () => {
      const storage = buildStorage();

      storage.writeObject("key", { a: 1, b: ["two"] });

      expect(storage.readObject("key")).toEqual({ a: 1, b: ["two"] });
    });

    it("reads unparseable JSON as null rather than throwing", () => {
      localStorage.setItem("key", "{ not json");

      expect(buildStorage().readObject("key")).toBeNull();
    });

    it("reads a stored non-object as null, since callers expect a shape", () => {
      localStorage.setItem("key", "42");

      expect(buildStorage().readObject("key")).toBeNull();
    });
  });

  describe("when the store refuses to co-operate", () => {
    it("survives a write that throws, as a full or private-mode store does", () => {
      const storage = buildStorage();
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });
      vi.spyOn(console, "warn").mockImplementation(() => undefined);

      expect(() => storage.writeString("key", "value")).not.toThrow();
    });

    it("survives a read that throws", () => {
      const storage = buildStorage();
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("SecurityError");
      });
      vi.spyOn(console, "warn").mockImplementation(() => undefined);

      expect(storage.readString("key")).toBeNull();
    });
  });
});
