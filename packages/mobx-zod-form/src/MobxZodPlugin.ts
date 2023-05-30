export interface MobxZodPlugin {
  name: string;
  /**
   * Executed when the form in started, in original order. Should not throw.
   */
  onStart?: () => void;
  /**
   * Executed when the form in started, in reverted order. Should not throw.
   */
  onEnd?: () => void;
  /**
   * Executed before we parse the raw input in `validate`, in original order.
   */
  onBeforeValidate?: () => void;
  /**
   * Executed at the end of `validate`, in reverted order.
   */
  onAfterValidate?: () => void;
  /**
   * Executed at the start of `handleSubmit` (after user submits), before we queue a validation task, in original order.
   * You can use this hook to modify the form content, before they are validated.
   * For example, automatically fill some fields.
   */
  onBeforeSubmit?: () => void;
  /**
   * Executed at the end of `handleSubmit`, after the effects (e.g. focusing the error) for the validation, in reverted order.
   */
  onAfterSubmit?: () => void;
}
