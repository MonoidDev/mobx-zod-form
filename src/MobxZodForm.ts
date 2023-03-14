import { action, computed, makeObservable, observable, when } from "mobx";
import { type ZodIssue, type ParsePath, type SafeParseReturnType } from "zod";

import { getPathId, setPath, shallowEqual, visitPath } from "./js-utils";
import { createFieldForType, type MapZodTypeToField } from "./MobxZodField";
import { resolveDOMMobxZodMeta, type MobxZodMeta } from "./MobxZodMeta";
import { type MobxZodTypes } from "./types";

export interface InputSetActionOptions {
  // Should validate synchronously
  validateSync?: boolean;
}

export interface SetActionOptions {
  validateSync: boolean;
}

export interface MobxZodFormOptions<T extends MobxZodTypes> {
  initialOutput?: T;
  validateOnMount?: boolean;
  setActionOptions?: InputSetActionOptions;
}

export class MobxZodForm<T extends MobxZodTypes> {
  _rawInput: unknown;

  schemaMobxZodMeta: MobxZodMeta;

  root: MapZodTypeToField<T>;

  _currentSetActionOptions?: SetActionOptions;

  _pendingValidation: boolean = false;

  constructor(
    public readonly schema: T,
    public readonly _options: MobxZodFormOptions<T> = {}
  ) {
    this.schemaMobxZodMeta = resolveDOMMobxZodMeta(schema);

    this._rawInput = this.schemaMobxZodMeta.encode(this.options.initialOutput);

    this.root = createFieldForType(this.schema, this, []);

    if (this.options.validateOnMount) {
      this.validate();
    }

    makeObservable(this, {
      _rawInput: observable,
      root: observable,
      _pendingValidation: observable,
      input: computed,
      parsed: computed,
      validate: action,
      _setRawInputAt: action,
    });
  }

  startValidationTask() {
    let validationTaskCancelled = false;

    const task = async () => {
      while (true) {
        await when(() => this._pendingValidation);

        if (validationTaskCancelled) {
          return;
        }

        await new Promise<void>((r) => {
          requestIdleCallback(() => {
            this.validate();
            r();
          });
        });
      }
    };

    task();

    return () => {
      validationTaskCancelled = true;
    };
  }

  get options() {
    return {
      initialOutput:
        "initialOutput" in this._options
          ? this._options.initialOutput
          : this.schemaMobxZodMeta.getInitialOutput(),
      validateOnMount: this._options.validateOnMount ?? false,
      setActionOptions: {
        validateSync: this._options.setActionOptions?.validateSync ?? false,
      },
    };
  }

  get rawInput() {
    return this._rawInput;
  }

  get input(): T["_input"] {
    return this.schemaMobxZodMeta.decode(this._rawInput);
  }

  get parsed(): SafeParseReturnType<T["_input"], T["_output"]> {
    return this.schema.safeParse(this.input);
  }

  _getRawInputAt(path: ParsePath): unknown {
    const v = visitPath(this._rawInput, path);
    return v;
  }

  _setRawInputAt(path: ParsePath, value: unknown) {
    if (path.length === 0) {
      this._rawInput = value;
    } else {
      setPath(this._rawInput, path, value);
    }

    this._notifyChange();
  }

  _notifyChange() {
    if (this.resolveCurrentSetActionOptions().validateSync) {
      this.validate();
    } else {
      this._pendingValidation = true;
    }
  }

  /**
   * Parse the input with the root schema,
   * then compare the new issues with old issues.
   * Only assign new errors to corresponding fields,
   * so that those unrelated fields are untouched.
   * Errors are compared against their error messages.
   */
  validate() {
    try {
      const newOutput = this.parsed;

      const issues = newOutput.success ? [] : newOutput.error.issues;

      const pathToIssues: Map<string, ZodIssue[]> = new Map();

      for (const issue of issues) {
        const pathId = getPathId(issue.path);
        pathToIssues.set(pathId, [...(pathToIssues.get(pathId) ?? []), issue]);
      }
      this.root._walk((field) => {
        const newFieldIssues = pathToIssues.get(getPathId(field.path)) ?? [];
        field._issues = newFieldIssues;

        if (
          !shallowEqual(
            newFieldIssues.map((e) => e.message),
            field.errorMessages
          )
        ) {
          field._errorMessages = newFieldIssues.map((e) => e.message);
        }
      });
    } finally {
      this._pendingValidation = false;
    }
  }

  withSetActionOptions(options: InputSetActionOptions, action: () => void) {
    const currentOptions = { ...this.options.setActionOptions, ...options };

    try {
      this._currentSetActionOptions = currentOptions;
      action();
    } finally {
      this._currentSetActionOptions = undefined;
    }
  }

  resolveCurrentSetActionOptions(): SetActionOptions {
    return this._currentSetActionOptions ?? this.options.setActionOptions;
  }
}
