import { action, computed, makeObservable, observable } from "mobx";
import type { ParsePath, ZodIssue } from "zod";

import {
  createFieldForType,
  MobxZodArrayField,
  MobxZodField,
  MobxZodObjectField,
  MobxZodObjectFieldFields,
} from "./MobxZodField";
import type { MobxZodForm, InputSetActionOptions } from "./MobxZodForm";
import { resolveDOMMobxZodMeta, MobxZodMeta } from "./MobxZodMeta";
import { MobxZodTypes, type MobxZodArray, type MobxZodObject } from "./types";

export class MobxZodBaseFieldImpl<T extends MobxZodTypes>
  implements MobxZodField<T>
{
  mobxZodMeta: MobxZodMeta;
  _issues: ZodIssue[] = [];
  _errorMessages: string[] = [];
  _touched: boolean = false;

  static curUniqueId = 0;

  uniqueId = ++MobxZodArrayFieldImpl.curUniqueId;

  constructor(
    public readonly type: T,
    public readonly form: MobxZodForm<any>,
    public path: ParsePath
  ) {
    this.mobxZodMeta = resolveDOMMobxZodMeta(this.type);
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
      ])
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
    public path: ParsePath
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
      createFieldForType(this.type.element, this.form, [...this.path, i])
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

  push(...items: this["_F"]["_elementOutput"][]) {
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
    values: this["_F"]["_elementOutput"][],
    _options?: InputSetActionOptions
  ) {
    this._elements.splice(
      start,
      deleteCount,
      ...values.map((_, i) =>
        createFieldForType(this.type.element, this.form, [
          ...this.path,
          start + i,
        ])
      )
    );

    // Move the indices on the right of the inserted items
    for (let i = 0; i < this._elements.length - start; i++) {
      this._elements[start + i]._updatePath([...this.path, start + i]);
    }
    this.rawInput.splice(start, deleteCount, ...values);
    this.form._notifyChange();
  }
}
