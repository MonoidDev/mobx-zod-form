import { AsyncLocalStorage } from "node:async_hooks";

import {
  setAsyncLocalStorage,
  MobxZodFormLocalStorage,
  extendZodWithMobxZodForm,
} from "@monoid-dev/mobx-zod-form";
import { z } from "zod";

export const asyncLocalStorage =
  new AsyncLocalStorage<MobxZodFormLocalStorage>();

setAsyncLocalStorage(asyncLocalStorage);

extendZodWithMobxZodForm(z);
