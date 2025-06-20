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
  ZodEnum,
  ZodNullable,
  ZodOptional,
  ZodEffects,
  ZodAny,
  ZodUndefined,
  ZodNull,
  ZodDate,
} from "zod";

import { DiscriminatorType, MobxZodBox } from "./zod-extra";

export type MobxZodLiteral = ZodLiteral<Primitive>;

export type MobxZodArray = ZodArray<ZodTypeAny, ArrayCardinality>;

export type MobxZodObject = SomeZodObject;

export type MobxZodDefault = ZodDefault<ZodTypeAny>;

export type MobxZodDiscriminatedUnion = ZodDiscriminatedUnion<
  string,
  ZodDiscriminatedUnionOption<string>[]
>;

export type MobxOmittableTypes =
  | ZodOptional<ZodTypeAny>
  | ZodNullable<ZodTypeAny>;

export type MobxZodEffects = ZodEffects<ZodTypeAny>;

export type MobxZodPrimitiveTypes =
  | ZodString
  | ZodNumber
  | ZodBoolean
  | ZodEnum<[string, ...string[]]>
  | MobxZodLiteral
  | ZodAny
  | ZodUndefined
  | ZodNull
  | ZodDate;

export type MobxZodTypes =
  | MobxZodPrimitiveTypes
  | ZodAny
  | MobxOmittableTypes
  | MobxZodObject
  | MobxZodArray
  | DiscriminatorType<MobxZodDiscriminatedUnion>
  | MobxZodDiscriminatedUnion
  | MobxZodEffects
  | MobxZodBox<ZodTypeAny>;
// | MobxZodDefault;
