import { autorun, toJS } from "mobx";
import { vi } from "vitest";
import { z } from "zod";

import { extendZodWithMobxZodForm } from "../src";

export const observeForm = (observer: (observe: (v: any) => void) => void) => {
  const fn = vi.fn();

  autorun(() => {
    observer(fn);
  });

  return {
    fn,
    get observed() {
      return fn.mock.calls.map((p) => toJS(p[0]));
    },
  };
};

export const setup = () => {
  extendZodWithMobxZodForm(z);
};
