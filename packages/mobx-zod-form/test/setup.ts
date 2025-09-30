import { z } from "zod";

import { extendZodWithMobxZodForm } from "../src";

globalThis.requestIdleCallback = (cb: IdleRequestCallback) => {
  return setTimeout(cb, 0);
};

extendZodWithMobxZodForm(z);
