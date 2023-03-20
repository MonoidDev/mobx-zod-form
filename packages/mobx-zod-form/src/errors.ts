import { SafeDecodeResultError } from "./FormMeta";

export class MobxZodDecodeError extends Error {
  constructor(public result: SafeDecodeResultError<any>) {
    super(`Decode error: got unexpected rawInput ${result.input}`);
  }
}

export class MobxFatalError extends Error {}

export class MobxZodInternalError extends Error {
  constructor(
    public internalMessage: string,
    message: string = "This is an internal error. It is never intended to happen and you should check the issues. ",
  ) {
    super(message);
  }
}
