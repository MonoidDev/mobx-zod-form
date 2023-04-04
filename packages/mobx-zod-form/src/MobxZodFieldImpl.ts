import { action, computed, makeObservable, observable } from "mobx";
import type {
  ParsePath,
  ZodIssue,
  ZodNullable,
  ZodOptional,
  ZodTypeAny,
} from "zod";

import { FormMeta } from "./FormMeta";
import { parseResultValueEqual } from "./js-utils";
import {
  createFieldForType,
  MobxZodArrayField,
  MobxZodDiscriminatedUnionField,
  MobxZodDiscriminatedUnionFieldTypes,
  MobxZodField,
  MobxZodObjectField,
  MobxZodObjectFieldFields,
  MobxZodOmittableField,
  MobxZodOmittableFieldTypes,
} from "./MobxZodField";
import type { MobxZodForm, InputSetActionOptions } from "./MobxZodForm";
import {
  type MobxZodDiscriminatedUnion,
  type MobxZodTypes,
  type MobxZodArray,
  type MobxZodObject,
  type MobxZodEffects,
} from "./types";
import { DiscriminatorType, discriminatorType } from "./zod-extra";

export class MobxZodBaseFieldImpl<T extends MobxZodTypes>
  implements MobxZodField<T>
{
  formMeta: FormMeta;
  element = null;
  _issues: ZodIssue[] = [];
  _errorMessages: string[] = [];
  _touched: boolean = false;

  static curUniqueId = 0;

  uniqueId = ++MobxZodArrayFieldImpl.curUniqueId;

  public readonly effects?: MobxZodEffects;

  constructor(
    public readonly type: T,
    public readonly form: MobxZodForm<any>,
    public path: ParsePath,
  ) {
    this.formMeta = this.type.getFormMeta();
    makeObservable(this, {
      _issues: observable,
      _errorMessages: observable,
      _touched: observable,
      rawInput: computed,
      issues: computed,
      touched: computed,
      setRawInput: action,
      setOutput: action,
      setTouched: action,
      _updatePath: action,
      _onInputChange: action,
    });
  }

  get rawInput() {
    return this.form._getRawInputAt(this.path);
  }

  get decodeResult() {
    return this.formMeta.safeDecode(this.rawInput);
  }

  get issues() {
    return this._issues;
  }

  get errorMessages() {
    return this._errorMessages;
  }

  get touched() {
    return this._touched;
  }

  setTouched(touched: boolean) {
    this._touched = touched;
  }

  setRawInput(value: unknown) {
    this.form._setRawInputAt(this.path, value);
    this._onInputChange();
  }

  setOutput(value: unknown) {
    this.form._setRawInputAt(this.path, this.formMeta.encode(value));
    this._onInputChange();
  }

  _onInputChange(): void {
    return;
  }

  _updatePath(newPath: ParsePath) {
    this.path = newPath;
  }

  _walk(f: (field: MobxZodField<any>) => void) {
    f(this);
  }
}
export class MobxZodOmittableFieldImpl<
    T extends ZodOptional<ZodTypeAny> | ZodNullable<ZodTypeAny>,
  >
  extends MobxZodBaseFieldImpl<T>
  implements MobxZodOmittableField<T>
{
  _types!: MobxZodOmittableFieldTypes<T>;
  _innerField: this["_types"]["_innerField"] | undefined =
    this.createMaybeField() as any;

  constructor(
    public readonly type: T,
    public readonly form: MobxZodForm<any>,
    public path: ParsePath,
  ) {
    super(type, form, path);

    makeObservable(this, {
      _innerField: observable,
      innerField: computed,
    });
  }

  createMaybeField() {
    if (this.rawInput == null) {
      return undefined;
    } else {
      return createFieldForType(this.type.unwrap(), this.form, this.path);
    }
  }

  get innerField() {
    return this._innerField;
  }

  _onInputChange(): void {
    const oldOmitted = this._innerField === undefined;
    const newOmitted = this.rawInput == null;

    if (newOmitted) {
      this._innerField = undefined;
    } else if (oldOmitted) {
      this._innerField = this.createMaybeField() as any;
    }
  }
}

export class MobxZodObjectFieldImpl<T extends MobxZodObject>
  extends MobxZodBaseFieldImpl<T>
  implements MobxZodObjectField<T>
{
  fields: MobxZodObjectFieldFields<T> = this._createFields() as any;

  _createFields() {
    return Object.fromEntries(
      Object.entries(this.type.shape).map(([key, type]) => [
        key,
        createFieldForType(type, this.form, [...this.path, key]),
      ]),
    );
  }

  _updatePath(newPath: ParsePath) {
    Object.values(this.fields).forEach((field) => {
      field._updatePath([...newPath, ...field.path.slice(newPath.length)]);
    });
  }

  _walk(f: (field: MobxZodField<any>) => void) {
    super._walk(f);
    Object.values(this.fields).forEach((field: MobxZodField<any>) =>
      field._walk(f),
    );
  }

  _onInputChange(): void {
    Object.values(this.fields).forEach((field: MobxZodField<any>) =>
      field._onInputChange(),
    );
  }
}

export class MobxZodArrayFieldImpl<T extends MobxZodArray>
  extends MobxZodBaseFieldImpl<T>
  implements MobxZodArrayField<T>
{
  _F!: MobxZodArrayField<T>;
  _elementOutput!: this["_F"]["_elementOutput"];
  _elements: MobxZodField<T["element"]>[] = this._createElements();

  constructor(
    public readonly type: T,
    public readonly form: MobxZodForm<any>,
    public path: ParsePath,
  ) {
    super(type, form, path);

    makeObservable(this, {
      _elements: observable,
      elements: computed,
      length: computed,
      pop: action,
      push: action,
      shift: action,
      splice: action,
    });
  }

  get rawInput() {
    return super.rawInput as unknown[];
  }

  _walk(f: (field: MobxZodField<any>) => void) {
    super._walk(f);
    this._elements.forEach((field) => field._walk(f));
  }

  _createElements() {
    return this.rawInput.map((_, i) =>
      createFieldForType(this.type.element, this.form, [...this.path, i]),
    );
  }

  get elements() {
    return this._elements as any;
  }

  get length() {
    return this._elements.length;
  }

  pop() {
    const last = this.rawInput[this._elements.length - 1];
    this.splice(this._elements.length - 1, 1, []);
    return last;
  }

  push(...items: this["_elementOutput"][]) {
    this.splice(this._elements.length, 0, items);
    return this._elements.length;
  }

  shift() {
    const first = this._elements[0];
    this.splice(0, 1, []);
    return first;
  }

  splice(
    start: number,
    deleteCount: number,
    values: this["_elementOutput"][],
    _options?: InputSetActionOptions,
  ) {
    this._elements.splice(
      start,
      deleteCount,
      ...values.map((_, i) =>
        createFieldForType(this.type.element, this.form, [
          ...this.path,
          start + i,
        ]),
      ),
    );

    // Move the indices on the right of the inserted items
    for (let i = 0; i < this._elements.length - start; i++) {
      this._elements[start + i]._updatePath([...this.path, start + i]);
    }
    this.rawInput.splice(
      start,
      deleteCount,
      ...values.map((v) => this.type.element.getFormMeta().encode(v)),
    );
    this.form._notifyChange();
  }

  _onInputChange(): void {
    const oldLength = this._elements.length;
    if (this.decodeResult.success) {
      const newLength = this.decodeResult.data.length;

      if (newLength > oldLength) {
        // Create new fields for new elements
        this._elements.push(
          ...new Array(newLength - oldLength)
            .fill(1)
            .map((_, i) =>
              createFieldForType(this.type.element, this.form, [
                ...this.path,
                oldLength + i,
              ]),
            ),
        );
      } else {
        // Delete extra fields
        this._elements.splice(newLength, oldLength - newLength);
      }

      this._elements.forEach((f) => f._onInputChange());
    } else {
      this._elements.splice(0, oldLength);
    }
  }
}

export class MobxZodDiscriminatorFieldImpl<
  T extends DiscriminatorType<MobxZodDiscriminatedUnion>,
> extends MobxZodBaseFieldImpl<T> {
  constructor(
    public readonly type: T,
    public readonly form: MobxZodForm<any>,
    public path: ParsePath,
    public parentField: MobxZodBaseFieldImpl<any>,
  ) {
    super(type, form, path);
  }

  _onInputChange(): void {
    this.parentField._onInputChange();
  }
}

export class MobxZodDiscriminatedUnionFieldImpl<
    T extends MobxZodDiscriminatedUnion,
  >
  extends MobxZodBaseFieldImpl<T>
  implements MobxZodDiscriminatedUnionField<T>
{
  _types!: MobxZodDiscriminatedUnionFieldTypes<T>;

  _currentDiscriminatorParsed!: this["_types"]["_discriminatorParsedResult"];
  _fields!: Record<string, MobxZodField<ZodTypeAny>>;

  discriminatorField: MobxZodField<this["_types"]["_discriminatorType"]>;

  constructor(
    public readonly type: T,
    public readonly form: MobxZodForm<any>,
    public path: ParsePath,
  ) {
    super(type, form, path);
    makeObservable(this, {
      _currentDiscriminatorParsed: observable,
      _fields: observable,
      fieldsResult: computed,
      _rawDisciminator: computed,
      _discriminatorParsed: computed,
      _updateFieldsForDiscriminator: action,
    });

    this.discriminatorField = this._createDiscriminatorField();
    this._updateFieldsForDiscriminator();
  }

  get _rawDisciminator(): any {
    return (this.rawInput as any)?.[this.type.discriminator];
  }

  get _discriminatorParsed(): this["_types"]["_discriminatorParsedResult"] {
    return this.discriminatorField.type.safeParse(this._rawDisciminator);
  }

  _createDiscriminatorField() {
    return new MobxZodDiscriminatorFieldImpl(
      discriminatorType(this.type),
      this.form,
      [...this.path, this.type.discriminator],
      this,
    );
  }

  _createFields(): Record<string, MobxZodField<ZodTypeAny>> {
    const discriminatorParsed = this._discriminatorParsed;

    if (discriminatorParsed.success) {
      const currentOption = this.type.optionsMap.get(discriminatorParsed.data)!;

      return Object.fromEntries(
        Object.keys(currentOption.shape)
          .filter((key) => key !== this.type.discriminator)
          .map((key) => [
            key,
            createFieldForType(this.type, this.form, [...this.path, key]),
          ]),
      );
    } else {
      return {};
    }
  }

  get fieldsResult(): this["_types"]["_fieldsResult"] {
    const discriminatorParsed = this._discriminatorParsed;

    if (discriminatorParsed.success) {
      return {
        success: true,
        fields: {
          ...this._fields,
          discriminator: discriminatorParsed.data,
        } as any,
      };
    } else {
      return {
        success: false,
        error: discriminatorParsed.error,
      };
    }
  }

  _updateFieldsForDiscriminator() {
    this._currentDiscriminatorParsed = this._discriminatorParsed;
    this._fields = this._createFields();
  }

  _onInputChange(): void {
    if (
      parseResultValueEqual(
        this._currentDiscriminatorParsed,
        this._discriminatorParsed,
      )
    ) {
      return;
    }
    this._updateFieldsForDiscriminator();

    if (
      this._currentDiscriminatorParsed.success &&
      !this.decodeResult.success
    ) {
      this.setOutput(
        this.type.optionsMap
          .get(this._currentDiscriminatorParsed.data)!
          .getFormMeta()
          .getInitialOutput(),
      );
    }

    this.discriminatorField._onInputChange();
    Object.values(this._fields).forEach((f) => {
      f._onInputChange();
    });
  }
}
