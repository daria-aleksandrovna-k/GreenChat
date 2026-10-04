interface PersistedStore {
  persist: {
    getOptions: () => { name?: string }
    rehydrate: () => Promise<void> | void
  }
}

/**
 * Rehydrates a persisted store when another tab writes the same localStorage key.
 * Without it, tabs would overwrite each other's data entirely.
 */
export function syncAcrossTabs(store: PersistedStore): void {
  if (typeof window === 'undefined') return
  const { name } = store.persist.getOptions()
  window.addEventListener('storage', (event) => {
    if (event.storageArea !== null && event.storageArea !== localStorage) return
    if (event.key === null || event.key === name) void store.persist.rehydrate()
  })
}
