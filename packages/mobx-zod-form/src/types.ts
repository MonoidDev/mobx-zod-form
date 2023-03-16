import type {
  ZodTypeAny,
  SomeZodObject,
  ZodArray,
  ArrayCardinality,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDefault,
  ZodDiscriminatedUnion,
  ZodDiscriminatedUnionOption,
  ZodLiteral,
  Primitive,
} from "zod";

import { DiscriminatorType } from "./zod-extra";

export type MobxZodLiteral = ZodLiteral<Primitive>;

export type MobxZodArray = ZodArray<ZodTypeAny, ArrayCardinality>;

export type MobxZodObject = SomeZodObject;

export type MobxZodDefault = ZodDefault<ZodTypeAny>;

export type MobxZodDiscriminatedUnion = ZodDiscriminatedUnion<
  string,
  ZodDiscriminatedUnionOption<string>[]
>;

export type MobxZodPrimitiveTypes =
  | ZodString
  | ZodNumber
  | ZodBoolean
  | MobxZodLiteral;

export type MobxZodTypes =
  | MobxZodPrimitiveTypes
  | MobxZodObject
  | MobxZodArray
  | DiscriminatorType<MobxZodDiscriminatedUnion>
  | MobxZodDiscriminatedUnion;
// | MobxZodDefault;
