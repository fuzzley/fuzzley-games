/** Types the `VITE_`-prefixed build-time variables this application reads. */
interface ImportMetaEnv {
  /** The commit the build was made from; absent from a local build. */
  readonly VITE_COMMIT_SHA?: string;
}
