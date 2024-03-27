export interface AsyncLocalStorage<T> {
  getStore(): T | undefined;
}

export interface MobxZodFormLocalStorage {
  curUniqueId: number;
  globalPathToId: Record<string, number>;
}

export let asyncLocalStorage:
  | AsyncLocalStorage<MobxZodFormLocalStorage>
  | undefined = undefined;

export const setAsyncLocalStorage = (
  a: AsyncLocalStorage<MobxZodFormLocalStorage> | undefined,
) => {
  asyncLocalStorage = a;
};

export const getServerLocalStorage = ():
  | MobxZodFormLocalStorage
  | undefined => {
  return typeof window !== "undefined"
    ? (window as any).__MOBX_ZOD_FORM_SERVER_LOCAL_STORAGE__
    : undefined;
};

export const createMobxZodFormLocalStorage = (): MobxZodFormLocalStorage => ({
  curUniqueId: 0,
  globalPathToId: {},
});
