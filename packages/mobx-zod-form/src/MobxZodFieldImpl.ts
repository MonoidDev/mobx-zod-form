import { action, computed, makeObservable, observable } from "mobx";
import type { ParsePath, ZodIssue, ZodTypeAny } from "zod";

import { FormMeta } from "./FormMeta";
import {
  createFieldForType,
  MobxZodArrayField,
  MobxZodDiscriminatedUnionField,
  MobxZodDiscriminatedUnionFieldTypes,
  MobxZodField,
  MobxZodObjectField,
  MobxZodObjectFieldFields,
} from "./MobxZodField";
import type { MobxZodForm, InputSetActionOptions } from "./MobxZodForm";
import {
  type MobxZodDiscriminatedUnion,
  type MobxZodTypes,
  type MobxZodArray,
  type MobxZodObject,
} from "./types";
import { discriminatorType } from "./zod-extra";

export class MobxZodBaseFieldImpl<T extends MobxZodTypes>
  implements MobxZodField<T>
{
  mobxZodMeta: FormMeta;
  _issues: ZodIssue[] = [];
  _errorMessages: string[] = [];
  _touched: boolean = false;

  static curUniqueId = 0;

  uniqueId = ++MobxZodArrayFieldImpl.curUniqueId;

  constructor(
    public readonly type: T,
    public readonly form: MobxZodForm<any>,
    public path: ParsePath,
  ) {
    this.mobxZodMeta = this.type.getFormMeta();
    makeObservable(this, {
      _issues: observable,
      _errorMessages: observable,
      _touched: observable,
      rawInput: computed,
      input: computed,
      issues: computed,
      touched: computed,
      setRawInput: action,
      setOutput: action,
      setTouched: action,
      _updatePath: action,
    });
  }

  get rawInput() {
    return this.form._getRawInputAt(this.path);
  }

  get input() {
    return this.mobxZodMeta.decode(this.rawInput);
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
    return this.form._setRawInputAt(this.path, value);
  }

  setOutput(value: unknown) {
    return this.form._setRawInputAt(this.path, this.mobxZodMeta.encode(value));
  }

  _updatePath(newPath: ParsePath) {
    this.path = newPath;
  }

  _walk(f: (field: MobxZodField<any>) => void) {
    f(this);
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
    Object.values(this.fields).forEach((field) => field._walk(f));
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
    this.rawInput.splice(start, deleteCount, ...values);
    this.form._notifyChange();
  }
}

export class MobxZodDiscriminatedUnionFieldImpl<
    T extends MobxZodDiscriminatedUnion,
  >
  extends MobxZodBaseFieldImpl<T>
  implements MobxZodDiscriminatedUnionField<T>
{
  _types!: MobxZodDiscriminatedUnionFieldTypes<T>;
  _fields: Record<string, MobxZodField<ZodTypeAny>> = this._createFields();

  discriminatorField: MobxZodField<this["_types"]["_discriminatorType"]>;

  constructor(
    public readonly type: T,
    public readonly form: MobxZodForm<any>,
    public path: ParsePath,
  ) {
    super(type, form, path);
    makeObservable(this, {
      fieldsResult: computed,
      _rawDisciminator: computed,
      _discriminatorParsed: computed,
    });

    this.discriminatorField = this._createDiscriminatorField();
  }

  get _rawDisciminator(): any {
    return (this.rawInput as any)?.[this.type.discriminator];
  }

  get _discriminatorParsed(): this["_types"]["_discriminatorParsedResult"] {
    return this.discriminatorField.type.safeParse(this._rawDisciminator);
  }

  _createDiscriminatorField() {
    return new MobxZodBaseFieldImpl(discriminatorType(this.type), this.form, [
      ...this.path,
      this.type.discriminator,
    ]);
  }

  _createFields(): Record<string, MobxZodField<ZodTypeAny>> {
    const discriminatorParsed = this._discriminatorParsed;

    if (discriminatorParsed.success) {
      const currentOption = this.type.optionsMap.get(discriminatorParsed.data)!;

      return Object.fromEntries(
        Object.keys(currentOption.shape)
          .filter((key) => key === this.type.discriminator)
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
        fields: this._fields as any,
      };
    } else {
      return {
        success: false,
        error: discriminatorParsed.error,
      };
    }
  }
}
