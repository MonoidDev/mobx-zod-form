import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
  untracked,
  when,
} from "mobx";
import {
  z,
  type ZodIssue,
  type ParsePath,
  type SafeParseReturnType,
} from "zod";

import {
  SafeDecodeResult,
  unwrapDecodeResult,
  type FormMeta,
} from "./FormMeta";
import { getPathId, setPath, shallowEqual, visitPath } from "./js-utils";
import { createFieldForType, type MapZodTypeToField } from "./MobxZodField";
import { type MobxZodPlugin } from "./MobxZodPlugin";
import { type MobxZodTypes } from "./types";

export interface InputSetActionOptions {
  // Should validate synchronously
  validateSync?: boolean;
}

export interface SetActionOptions {
  validateSync: boolean;
}

export interface MobxZodFormOptions<T extends MobxZodTypes> {
  id?: string;
  initialOutput?: z.infer<T>;
  validateOnMount?: boolean;
  setActionOptions?: InputSetActionOptions;
  /**
   * Should we focus the element with error after submitting?
   * 1. false:
   *    do not focus at all.
   * 2. "first-y":
   *    focus on the element having the smallest `y`, then `x`.
   *    Useful when your layout is a single column.
   * 3. "first-x":
   *    focus on the element having the smallest `x`, then `y`.
   *    Useful when you expect your user complete the form column by column.
   */
  shouldFocusError?: false | "first-y" | "first-x";
  plugins?: MobxZodPlugin[];
}

interface ValidationTask {
  resolve?: () => void;
  reject?: (e: any) => void;
  prior?: boolean;
}

export class MobxZodForm<T extends MobxZodTypes> {
  _rawInput: unknown;

  _isDirty: boolean = false;

  _isValidationPending: boolean = false;

  _submitCount: number = 0;

  _isSubmitting: boolean = false;

  _parsed?: SafeParseReturnType<T["_input"], T["_output"]>;

  schemaFormMeta: FormMeta;

  element: HTMLFormElement | null = null;

  root: MapZodTypeToField<T>;

  _currentSetActionOptions?: SetActionOptions;

  _validationTasks: ValidationTask[] = [];

  id: string;

  _curFieldUniqueId = 0;

  constructor(
    public readonly schema: T,
    public readonly _options: MobxZodFormOptions<T> = {},
  ) {
    this.schemaFormMeta = schema.getFormMeta();

    this._rawInput = this.schemaFormMeta.encode(this.options.initialOutput);

    // To work around 'Field not found' when compiled to cjs by tsup.
    this.root = undefined as any;
    this.id = this._options.id ?? "";

    makeObservable(this, {
      _rawInput: observable,
      _isDirty: observable,
      _isValidationPending: observable,
      _submitCount: observable,
      _isSubmitting: observable,
      root: observable,
      _validationTasks: observable,
      isDirty: computed,
      isValidationPending: computed,
      submitCount: computed,
      isSubmitting: computed,
      input: computed,
      looseInput: computed,
      validate: action,
      _setRawInputAt: action,
      _notifyChange: action,
    });

    this.root = untracked(() => createFieldForType(this.schema, this, []));

    if (this.options.validateOnMount) {
      this.validate();
    }
  }

  getFieldUniqueId() {
    return `${this.id}${++this._curFieldUniqueId}`;
  }

  flushValidationTasks() {
    try {
      this.validate();
      this._validationTasks.forEach((p) => p.resolve?.());
    } catch (e) {
      this._validationTasks.forEach((p) => p.reject?.(e));
      throw e;
    } finally {
      runInAction(() => {
        this._validationTasks.length = 0;
        this._isValidationPending = false;
      });
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

  start() {
    const disposeValidationWorker = this.options.setActionOptions.validateSync
      ? undefined
      : this.startValidationWorker();
    for (const plugin of this.options.plugins) {
      plugin.onStart?.(this);
    }

    return () => {
      disposeValidationWorker?.();

      for (const plugin of [...this.options.plugins].reverse()) {
        plugin.onEnd?.(this);
      }
    };
  }

  get options() {
    return {
      initialOutput:
        "initialOutput" in this._options
          ? this._options.initialOutput
          : this.schemaFormMeta.getInitialOutput(),
      validateOnMount: this._options.validateOnMount ?? false,
      setActionOptions: {
        validateSync: this._options.setActionOptions?.validateSync ?? false,
      },
      shouldFocusError: this._options.shouldFocusError ?? "first-y",
      plugins: this._options.plugins ?? [],
    } satisfies MobxZodFormOptions<T>;
  }

  get rawInput() {
    return this._rawInput;
  }

  get isDirty() {
    return this._isDirty;
  }

  get isValidationPending() {
    return this._isValidationPending;
  }

  get submitCount() {
    return this._submitCount;
  }

  get isSubmitting() {
    return this._isSubmitting;
  }

  get input(): SafeDecodeResult<unknown, T["_input"]> {
    return this.schemaFormMeta.safeDecode(this._rawInput);
  }

  get looseInput(): SafeDecodeResult<unknown, unknown> {
    return this.schemaFormMeta.safeDecode(this._rawInput, true);
  }

  get parsed(): SafeParseReturnType<T["_input"], T["_output"]> {
    if (this._parsed) return this._parsed;

    if (this.input.success) {
      return (this._parsed = this.schema.safeParse(this.input.data));
    } else {
      return (this._parsed = this.schema.safeParse(
        unwrapDecodeResult(this.looseInput),
      ));
    }
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
    this._parsed = undefined;

    if (this.resolveCurrentSetActionOptions().validateSync) {
      this.validate();
    } else {
      this._isValidationPending = true;
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
    this.options.plugins.forEach((plugin) => {
      plugin?.onBeforeValidate?.(this);
    });

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

    [...this.options.plugins].reverse().forEach((plugin) => {
      plugin?.onAfterValidate?.(this);
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
      this.options.plugins.forEach((p) => p.onBeforeSubmit?.(this));

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

      runInAction(() => {
        this.root._walk((f) => {
          f.setTouched(true);
          f.setExtraErrorMessages([]);
        });
      });

      await onSubmit();
    } finally {
      runInAction(() => {
        this._isSubmitting = false;
      });

      if (this.options.shouldFocusError) {
        this.focusError();
      }

      [...this.options.plugins]
        .reverse()
        .forEach((p) => p.onAfterSubmit?.(this));
    }
  }

  focusError() {
    const candidates: HTMLElement[] = [];
    try {
      this.root._walk((f) => {
        if (
          (f._errorMessages.length > 0 || f._extraErrorMessages.length > 0) &&
          f.element &&
          f.element.isConnected
        ) {
          candidates.push(f.element);
        }
      });
    } catch (e) {
      throw e;
    }

    if (candidates.length > 0) {
      const getPriority: (e: HTMLElement) => number =
        this.options.shouldFocusError === "first-y"
          ? (e) =>
              10000 * e.getBoundingClientRect().y + e.getBoundingClientRect().x
          : (e) =>
              10000 * e.getBoundingClientRect().x + e.getBoundingClientRect().y;

      candidates.sort((a, b) => getPriority(a) - getPriority(b));
      candidates[0].focus();
    }
  }
}
