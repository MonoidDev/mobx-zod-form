import {
  z,
  ZodEffects,
  ZodIssueCode,
  ZodNullable,
  ZodOptional,
  ZodType,
  ZodTypeAny,
  ZodTypeDef,
} from "zod";

import { MobxZodDiscriminatedUnionFieldTypes } from "./MobxZodField";
import { MobxZodDiscriminatedUnion } from "./types";

export type DiscriminatorType<T extends MobxZodDiscriminatedUnion> = ZodType<
  T["options"][number]["shape"][T["discriminator"]]["_output"],
  ZodTypeDef
>;

export const discriminatorType = <T extends MobxZodDiscriminatedUnion>(
  type: T,
): DiscriminatorType<T> => {
  const result = z
    .custom<MobxZodDiscriminatedUnionFieldTypes<T>["_discriminatorOutput"]>()
    .superRefine((arg, ctx) => {
      // @see https://github.com/colinhacks/zod/blob/6dad90785398885f7b058f5c0760d5ae5476b833/src/types.ts#L2929

      if (!type.optionsMap.get(arg)) {
        ctx.addIssue({
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(type.optionsMap.keys()),
          path: [type.discriminator],
        });
        return z.INVALID;
      }
    });

  return result;
};

export const unwrapZodType = (t: ZodTypeAny): ZodTypeAny => {
  if (t instanceof ZodEffects) {
    return unwrapZodType(t.innerType());
  } else if (t instanceof ZodNullable || t instanceof ZodOptional) {
    return unwrapZodType(t.unwrap());
  }
  return t;
};
