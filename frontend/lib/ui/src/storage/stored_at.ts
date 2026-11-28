/** Says where an entry is kept in storage: under its key, in the shape its version names. */
export interface StoredAt {
  /** The key the entry is kept under. Renaming it loses what every player kept. */
  readonly key: string;
  /** The shape the entry is kept in; an entry of any other is read as none. */
  readonly version: number;
}
