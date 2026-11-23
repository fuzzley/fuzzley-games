import {
  type Binding,
  DestroyRef,
  ErrorHandler,
  PendingTasks,
  type Type,
  type ViewContainerRef,
  inject,
} from "@angular/core";

/** Loads a component a chunk of its own holds: an `import()` of its file, `.then()` to the component. */
export type ComponentLoad = () => Promise<Type<unknown>>;

/**
 * Returns a function that, the first time it is called, loads a component
 * and creates it at the end of a container, with the bindings given.
 *
 * It is how an app keeps a piece the page may never show, with what only
 * it imports, out of the main chunk, fetched once it is first wanted, as
 * Angular's `@defer` would, without its runtime, which costs the main chunk
 * about 6 kB.
 *
 * Every call hands back the first one's promise, which says, once the load
 * has settled, whether the component was made. Until then the load is a
 * pending task, so `whenStable()` waits for it, as it does for a deferred
 * block. A load that fails, as one of a chunk a newer build has dropped
 * does, goes to the `ErrorHandler` and is forgotten, so the next call tries
 * again; one that arrives after its container's component has gone makes
 * nothing.
 *
 * Must be called in an injection context: the component's own, whose
 * end it watches.
 */
export function onDemand(
  load: ComponentLoad,
  host: () => ViewContainerRef,
  bindings: readonly Binding[],
): () => Promise<boolean> {
  const tasks = inject(PendingTasks);
  const destroyRef = inject(DestroyRef);
  const errors = inject(ErrorHandler);
  let created: Promise<boolean> | null = null;
  return () => {
    if (created) return created;
    const done = tasks.add();
    created = load()
      .then((component) => {
        if (destroyRef.destroyed) return false;
        host().createComponent(component, { bindings: [...bindings] });
        return true;
      })
      .catch((error: unknown) => {
        created = null;
        errors.handleError(error);
        return false;
      })
      .finally(done);
    return created;
  };
}
