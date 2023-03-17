import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
  when,
} from "mobx";
import {
  z,
  type ZodIssue,
  type ParsePath,
  type SafeParseReturnType,
} from "zod";

import { type FormMeta } from "./FormMeta";
import { getPathId, setPath, shallowEqual, visitPath } from "./js-utils";
import { createFieldForType, type MapZodTypeToField } from "./MobxZodField";
import { type MobxZodTypes } from "./types";

export interface InputSetActionOptions {
  // Should validate synchronously
  validateSync?: boolean;
}

export interface SetActionOptions {
  validateSync: boolean;
}

export interface MobxZodFormOptions<T extends MobxZodTypes> {
  initialOutput?: z.infer<T>;
  validateOnMount?: boolean;
  setActionOptions?: InputSetActionOptions;
}

interface ValidationTask {
  resolve?: () => void;
  reject?: (e: any) => void;
  prior?: boolean;
}

export class MobxZodForm<T extends MobxZodTypes> {
  _rawInput: unknown;

  _isDirty: boolean = false;

  _submitCount: number = 0;

  _isSubmitting: boolean = false;

  schemaMobxZodMeta: FormMeta;

  root: MapZodTypeToField<T>;

  _currentSetActionOptions?: SetActionOptions;

  _validationTasks: ValidationTask[] = [];

  constructor(
    public readonly schema: T,
    public readonly _options: MobxZodFormOptions<T> = {},
  ) {
    this.schemaMobxZodMeta = schema.getFormMeta();

    this._rawInput = this.schemaMobxZodMeta.encode(this.options.initialOutput);

    this.root = createFieldForType(this.schema, this, []);

    if (this.options.validateOnMount) {
      this.validate();
    }

    makeObservable(this, {
      _rawInput: observable,
      _isDirty: observable,
      _submitCount: observable,
      _isSubmitting: observable,
      root: observable,
      _validationTasks: observable,
      isDirty: computed,
      submitCount: computed,
      isSubmitting: computed,
      input: computed,
      parsed: computed,
      validate: action,
      _setRawInputAt: action,
      _notifyChange: action,
    });
  }

  flushValidationTasks() {
    try {
      this.validate();
      this._validationTasks.forEach((p) => p.resolve?.());
    } catch (e) {
      this._validationTasks.forEach((p) => p.reject?.(e));
      throw e;
    } finally {
      this._validationTasks.length = 0;
    }
  }

  startValidationWorker() {
    if (this.options.setActionOptions.validateSync) {
      throw new Error(
        "You have set validateSync: true, so probably you do not want to start a async validation worker. ",
      );
    }

    let validationTaskCancelled = false;

    const task = async () => {
      while (true) {
        await when(() => this._validationTasks.length > 0);

        if (validationTaskCancelled) {
          return;
        }

        if (this._validationTasks.some((t) => t.prior)) {
          this.flushValidationTasks();
        } else {
          await new Promise<void>((r) => {
            requestIdleCallback(() => {
              this.flushValidationTasks();
              r();
            });
          });
        }
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

  get isDirty() {
    return this._isDirty;
  }

  get submitCount() {
    return this._submitCount;
  }

  get isSubmitting() {
    return this._isSubmitting;
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

    this._isDirty = true;

    this._notifyChange();
  }

  _notifyChange() {
    if (this.resolveCurrentSetActionOptions().validateSync) {
      this.validate();
    } else {
      this._validationTasks.push({});
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
          field.errorMessages,
        )
      ) {
        field._errorMessages = newFieldIssues.map((e) => e.message);
      }
    });
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

  async handleSubmit(onSubmit: () => Promise<void> | void) {
    try {
      let validationPromise!: Promise<void>;

      runInAction(() => {
        this._isSubmitting = true;
        this._submitCount++;
        if (!this.options.setActionOptions.validateSync) {
          validationPromise = new Promise<void>((resolve, reject) => {
            this._validationTasks.push({ resolve, reject, prior: true });
          });
        } else {
          this.validate();
          validationPromise = Promise.resolve();
        }
      });

      await validationPromise;

      this.root._walk((f) => f.setTouched(true));

      await onSubmit();
    } finally {
      runInAction(() => {
        this._isSubmitting = false;
      });
    }
  }
}
