import { SafeParseReturnType, type ParsePath } from "zod";

import { MobxZodInternalError } from "./errors";

export const visitPath = (object: any, path: ParsePath) => {
  let current = object;

  for (const key of path) {
    current = current[key];
  }

  return current;
};

export const setPath = (object: any, path: ParsePath, value: any) => {
  let current = object;
  let i = 0;

  for (const key of path) {
    if (i < path.length - 1) {
      current = current[key];
    } else {
      current[key] = value;
    }

    i++;
  }
};

export const getPathId = (path: ParsePath) => path.join(".") || ".";

export const shallowEqual = (a: any, b: any) => {
  if (a === b) return true;

  if (Object.keys(a).length !== Object.keys(b).length) return false;

  return Object.entries(a).every(([k, v]) => b[k] === v);
};

export const parseResultValueEqual = (
  a: SafeParseReturnType<any, any>,
  b: SafeParseReturnType<any, any>,
) => {
  if (!a.success && !b.success) {
    return true;
  }

  if (a.success !== b.success) {
    return true;
  }

  if (a.success && b.success) {
    return a.data === b.data;
  }

  throw new MobxZodInternalError("Not possible to reach here.");
};
