import type { ParsePath } from "zod";

import { asyncLocalStorage, getServerLocalStorage } from "./ssr";

let curClientUniqueId = 0;

export const getUniqueId = (formId: string, path: ParsePath) => {
  if (asyncLocalStorage === undefined) {
    const serverLocalStorage = getServerLocalStorage();

    if (serverLocalStorage) {
      // We are hydrating on the client
      const ssrId = serverLocalStorage.globalPathToId[formId + path.join(".")];

      return ssrId ?? ++serverLocalStorage.curUniqueId;
    } else {
      // Pure client side rendering
      return ++curClientUniqueId;
    }
  } else {
    const store = asyncLocalStorage.getStore();

    if (!store) {
      throw new Error(
        "AsyncLocalStorage is not accessible. Did you forget to provide an async context?",
      );
    }

    const uniqueId = ++store.curUniqueId;

    store.globalPathToId[formId + path.join(".")] = uniqueId;

    return uniqueId;
  }
};
