import { autorun, toJS } from "mobx";
import { vi } from "vitest";

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
