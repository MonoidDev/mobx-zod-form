import { extendZodWithMobxZodForm } from "@monoid-dev/mobx-zod-form";
import matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { expect, afterEach } from "vitest";
import { z } from "zod";

extendZodWithMobxZodForm(z);

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

globalThis.requestIdleCallback = (callback: IdleRequestCallback) =>
  setTimeout(callback);
