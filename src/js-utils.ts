import { type ParsePath } from "zod";

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

export const getPathId = (path: ParsePath) => path.join(".");

export const shallowEqual = (a: any, b: any) => {
  if (a === b) return true;

  if (Object.keys(a).length !== Object.keys(b).length) return false;

  return Object.entries(a).every(([k, v]) => b[k] === v);
};
