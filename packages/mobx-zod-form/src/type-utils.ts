import { ZodNullable, ZodOptional } from "zod";

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// Get indexes of a tuple
export type IdxOf<T extends any[]> = Exclude<keyof T, keyof any[]>;

export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;
export type IsAny<T> = IfAny<T, true, never>;

export type ExcludeNeverArray<T> = T extends never[] ? never : T;

export type UnwrapZodNullish<T> = T extends ZodNullable<infer U>
  ? U
  : T extends ZodOptional<infer U>
  ? U
  : never;
