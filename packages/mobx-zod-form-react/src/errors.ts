import { MobxZodField } from "@monoid-dev/mobx-zod-form";
import { ZodTypeAny } from "zod";

export class UnsupportedInputType extends Error {
  constructor(public inputType: string, public zodType: ZodTypeAny) {
    super(
      `input type=${JSON.stringify(inputType)} for zod type ${
        zodType.constructor.name
      } is not supported. You may bind the field on your own!`,
    );
  }
}

export class NotReactFormField extends Error {
  constructor(public field: MobxZodField<ZodTypeAny>) {
    super(
      `Field ${field.path.join(
        ".",
      )} is not attached to a ReactForm. Did you use \`new ReactForm\`?`,
    );
  }
}
