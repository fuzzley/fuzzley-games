import { TestBed } from "@angular/core/testing";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ISSUE_FIELDS } from "./issue_link";
import { BUG_REPORT_CONFIG } from "./tokens";

/**
 * The issue form, which GitHub reads from the repository's root: read from
 * disk, since this library's Vitest config doesn't let Vite serve a file
 * outside `frontend/` to an import.
 */
const issueForm = readFileSync(
  join(
    import.meta.dirname,
    "../../../../../.github/ISSUE_TEMPLATE/game_bug_report.yml",
  ),
  "utf8",
);

/** Describes a field the issue form declares. */
interface FormField {
  readonly type: string;
  readonly id: string;
}

/** Returns the text of one field of the issue form, up to the next field. */
function fieldText(form: string, id: string): string {
  const [text = ""] = form.slice(form.indexOf(`id: ${id}\n`)).split("- type:");
  return text;
}

/** Returns each field of the issue form that has an `id`, in order. */
function formFields(form: string): FormField[] {
  return [...form.matchAll(/^\s+- type:\s*(\S+)\n\s+id:\s*(\S+)\s*$/gm)].map(
    ([, type = "", id = ""]) => ({ type, id }),
  );
}

describe("the issue form", () => {
  it("is the form reports are filed on", () => {
    expect(TestBed.inject(BUG_REPORT_CONFIG).template).toBe(
      "game_bug_report.yml",
    );
  });

  it("has every field the link fills in", () => {
    const ids = formFields(issueForm).map(({ id }) => id);

    expect(ids).toEqual(expect.arrayContaining(Object.values(ISSUE_FIELDS)));
  });

  it("takes a screenshot after what happened", () => {
    const ids = formFields(issueForm).map(({ id }) => id);

    expect(ids[ids.indexOf("screenshot") - 1]).toBe("what-happened");
  });

  it("takes the screenshot as an upload of an image", () => {
    expect(formFields(issueForm)).toContainEqual({
      type: "upload",
      id: "screenshot",
    });
    expect(fieldText(issueForm, "screenshot")).toContain(
      'accept: ".png,.jpg,.jpeg,.gif,.webp"',
    );
  });
});
