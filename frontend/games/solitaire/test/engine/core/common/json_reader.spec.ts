import { describe, it, expect } from "vitest";
import {
  readBoolean,
  readList,
  readNumber,
  readObject,
  readRecord,
  readString,
} from "@/engine/core/common/json_reader";

describe("json readers", () => {
  it("read a value of the type they expect as it is", () => {
    const read = [
      readString("ace", "card"),
      readBoolean(true, "faceUp"),
      readNumber(12, "score"),
    ];

    expect(read).toEqual(["ace", true, 12]);
  });

  it("read an object for its fields to be read one by one", () => {
    expect(readObject({ id: "ace" }, "card")).toEqual({ id: "ace" });
  });

  it("read every item of a list", () => {
    expect(readList(["a", "b"], "ids", readString)).toEqual(["a", "b"]);
  });

  it("read every value of a record", () => {
    expect(readRecord({ drawCount: 3 }, "options", readNumber)).toEqual({
      drawCount: 3,
    });
  });

  it.each([
    [
      "an object from a list",
      () => readObject([], "card"),
      /card is not an object/,
    ],
    [
      "an object from null",
      () => readObject(null, "card"),
      /card is not an object/,
    ],
    [
      "a list from an object",
      () => readList({}, "ids", readString),
      /ids is not a list/,
    ],
    ["text from a number", () => readString(1, "id"), /id is not text/],
    [
      "true or false from text",
      () => readBoolean("yes", "faceUp"),
      /faceUp is not true or false/,
    ],
    [
      "a number from text",
      () => readNumber("12", "score"),
      /score is not a number/,
    ],
    [
      "a number from infinity",
      () => readNumber(Infinity, "score"),
      /score is not a number/,
    ],
  ])("refuse to read %s", (_name, read, error) => {
    expect(read).toThrow(error);
  });

  it("name a list item by its index", () => {
    expect(() => readList(["a", 2], "ids", readString)).toThrow(
      /ids\[1\] is not text/,
    );
  });

  it("name a record value by its key", () => {
    expect(() =>
      readRecord({ drawCount: "three" }, "options", readNumber),
    ).toThrow(/options\.drawCount is not a number/);
  });
});
