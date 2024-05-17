import { MobxZodField } from "@monoid-dev/mobx-zod-form";
import {
  ZodBoolean,
  ZodEnum,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodTypeAny,
} from "zod";

import { BooleanInput } from "./BooleanInput";
import { EnumInput } from "./EnumInput";
import { NumberInput } from "./NumberInput";
import { ObjectInput } from "./ObjectInput";
import { OmittableInput } from "./OmittableInput";
import { StringInput } from "./StringInput";

export const AnyInput: React.FC<{
  field: MobxZodField<ZodTypeAny>;
}> = ({ field }) => {
  return field.type instanceof ZodString ? (
    <StringInput field={field as any} />
  ) : field.type instanceof ZodNumber ? (
    <NumberInput field={field as any} />
  ) : field.type instanceof ZodObject ? (
    <ObjectInput field={field as any} />
  ) : field.type instanceof ZodEnum ? (
    <EnumInput field={field as any} />
  ) : field.type instanceof ZodOptional ? (
    <OmittableInput field={field as any} />
  ) : field.type instanceof ZodNullable ? (
    <OmittableInput field={field as any} />
  ) : field.type instanceof ZodBoolean ? (
    <BooleanInput field={field as any} />
  ) : (
    <div>Unsupported field type</div>
  );
};
