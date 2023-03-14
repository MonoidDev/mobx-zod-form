import type {
  ZodTypeAny,
  SomeZodObject,
  ZodArray,
  ArrayCardinality,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDefault,
} from "zod";

export type MobxZodArray = ZodArray<ZodTypeAny, ArrayCardinality>;

export type MobxZodObject = SomeZodObject;

export type MobxZodDefault = ZodDefault<ZodTypeAny>;

export type MobxZodPrimitiveTypes = ZodString | ZodNumber | ZodBoolean;

export type MobxZodTypes = MobxZodPrimitiveTypes | MobxZodObject | MobxZodArray;
// | MobxZodDefault;
