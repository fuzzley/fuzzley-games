/** Says which version and commit of the site a build is, and when it ran. */
export interface BuildInfo {
  readonly version: string;
  /** The short commit hash, or "dev" when the build couldn't tell which. */
  readonly commit: string;
  /** An ISO timestamp. */
  readonly buildTime: string;
}
