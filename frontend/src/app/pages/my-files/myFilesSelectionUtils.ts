export function toggleSetValue<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current);

  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  return next;
}

export function applyVisibleSelection<T>(
  current: Set<T>,
  visibleIds: Iterable<T>,
  shouldSelect: boolean,
): Set<T> {
  const next = new Set(current);

  if (shouldSelect) {
    for (const id of visibleIds) {
      next.add(id);
    }
  } else {
    for (const id of visibleIds) {
      next.delete(id);
    }
  }

  return next;
}
