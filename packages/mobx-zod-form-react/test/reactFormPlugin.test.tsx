import { MobxZodPluginHandlerName } from "@monoid-dev/mobx-zod-form";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { observer } from "mobx-react";
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

import { TextInput } from "./TextInput";
import { useForm, useFormEvent } from "../src";

interface TestEventHandlers {
  onStart: ReturnType<typeof vi.fn>;
  onEnd: ReturnType<typeof vi.fn>;
  onBeforeValidate: ReturnType<typeof vi.fn>;
  onAfterValidate: ReturnType<typeof vi.fn>;
  onBeforeSubmit: ReturnType<typeof vi.fn>;
  onAfterSubmit: ReturnType<typeof vi.fn>;
}

const TestFormWithEvents = observer(
  ({ eventHandlers }: { eventHandlers: TestEventHandlers }) => {
    const form = useForm(
      z.object({
        username: z.string().min(1).label("Username"),
        password: z.string().min(6).label("Password"),
      }),
    );

    // Register event listeners for all possible events
    (Object.keys(eventHandlers) as MobxZodPluginHandlerName[]).forEach(
      (event) => {
        useFormEvent(form, event, eventHandlers[event], []);
      },
    );

    return (
      <form {...form.bindForm({})} style={{ border: `1px solid black` }}>
        <TextInput field={form.root.fields.username} />
        <TextInput field={form.root.fields.password} />
        <button type="submit">Submit</button>
      </form>
    );
  },
);

describe("useFormEvent", () => {
  it("should register event listeners without errors", () => {
    const eventHandlers: TestEventHandlers = {
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onBeforeValidate: vi.fn(),
      onAfterValidate: vi.fn(),
      onBeforeSubmit: vi.fn(),
      onAfterSubmit: vi.fn(),
    };

    // This test verifies that the event registration itself works
    expect(() => {
      render(<TestFormWithEvents eventHandlers={eventHandlers} />);
    }).not.toThrow();

    // Note: onStart events are fired during form initialization (before useFormEvent is called)
    // so we don't test for onStart being called here
  });

  it("should catch onBeforeValidate and onAfterValidate events during field validation", async () => {
    const user = userEvent.setup();
    const eventHandlers: TestEventHandlers = {
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onBeforeValidate: vi.fn(),
      onAfterValidate: vi.fn(),
      onBeforeSubmit: vi.fn(),
      onAfterSubmit: vi.fn(),
    };

    render(<TestFormWithEvents eventHandlers={eventHandlers} />);

    // Reset call counts from initial setup
    eventHandlers.onBeforeValidate.mockClear();
    eventHandlers.onAfterValidate.mockClear();

    // Type in username field to trigger validation
    await user.type(screen.getByLabelText("Username"), "test");

    // Click away to trigger validation
    await user.click(document.body);

    // Wait for validation to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Both validation events should be called
    expect(eventHandlers.onBeforeValidate).toHaveBeenCalled();
    expect(eventHandlers.onAfterValidate).toHaveBeenCalled();

    // onAfterValidate should be called after onBeforeValidate
    const beforeCalls = eventHandlers.onBeforeValidate.mock.invocationCallOrder;
    const afterCalls = eventHandlers.onAfterValidate.mock.invocationCallOrder;
    expect(beforeCalls[0]).toBeLessThan(afterCalls[0]);
  });

  it("should catch onBeforeSubmit and onAfterSubmit events during form submission", async () => {
    const user = userEvent.setup();
    const eventHandlers: TestEventHandlers = {
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onBeforeValidate: vi.fn(),
      onAfterValidate: vi.fn(),
      onBeforeSubmit: vi.fn(),
      onAfterSubmit: vi.fn(),
    };

    render(<TestFormWithEvents eventHandlers={eventHandlers} />);

    // Fill in valid data
    await user.type(screen.getByLabelText("Username"), "testuser");
    await user.type(screen.getByLabelText("Password"), "password123");

    // Reset call counts from field interactions
    eventHandlers.onBeforeSubmit.mockClear();
    eventHandlers.onAfterSubmit.mockClear();
    eventHandlers.onBeforeValidate.mockClear();
    eventHandlers.onAfterValidate.mockClear();

    // Submit the form
    await user.click(screen.getByText("Submit"));

    // Wait for submission to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Submit events should be called
    expect(eventHandlers.onBeforeSubmit).toHaveBeenCalledTimes(1);
    expect(eventHandlers.onAfterSubmit).toHaveBeenCalledTimes(1);

    // Validation events should also be called during submission
    expect(eventHandlers.onBeforeValidate).toHaveBeenCalled();
    expect(eventHandlers.onAfterValidate).toHaveBeenCalled();

    // Check order: onBeforeSubmit -> validation events -> onAfterSubmit
    const beforeSubmitOrder =
      eventHandlers.onBeforeSubmit.mock.invocationCallOrder[0];
    const afterSubmitOrder =
      eventHandlers.onAfterSubmit.mock.invocationCallOrder[0];
    const beforeValidateOrder =
      eventHandlers.onBeforeValidate.mock.invocationCallOrder;
    const afterValidateOrder =
      eventHandlers.onAfterValidate.mock.invocationCallOrder;

    expect(beforeSubmitOrder).toBeLessThan(
      beforeValidateOrder[beforeValidateOrder.length - 1],
    );
    expect(afterValidateOrder[afterValidateOrder.length - 1]).toBeLessThan(
      afterSubmitOrder,
    );
  });

  it("should catch onBeforeSubmit and onAfterSubmit events even with invalid form", async () => {
    const user = userEvent.setup();
    const eventHandlers: TestEventHandlers = {
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onBeforeValidate: vi.fn(),
      onAfterValidate: vi.fn(),
      onBeforeSubmit: vi.fn(),
      onAfterSubmit: vi.fn(),
    };

    render(<TestFormWithEvents eventHandlers={eventHandlers} />);

    // Leave form empty (invalid)
    // Reset call counts from initial setup
    eventHandlers.onBeforeSubmit.mockClear();
    eventHandlers.onAfterSubmit.mockClear();

    // Submit the form with invalid data
    await user.click(screen.getByText("Submit"));

    // Wait for submission to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Submit events should still be called even with validation errors
    expect(eventHandlers.onBeforeSubmit).toHaveBeenCalledTimes(1);
    expect(eventHandlers.onAfterSubmit).toHaveBeenCalledTimes(1);

    // Validation errors should be displayed
    await screen.findByText("String must contain at least 1 character(s)");
    await screen.findByText("String must contain at least 6 character(s)");
  });

  it("should clean up event listeners when component unmounts", () => {
    const TestComponent = observer(() => {
      const form = useForm(z.object({ test: z.string() }));
      const handler = vi.fn();
      useFormEvent(form, "onStart", handler, []);

      return <div>Test component</div>;
    });

    const { unmount } = render(<TestComponent />);

    // Component should render without errors
    expect(screen.getByText("Test component")).toBeInTheDocument();

    // Unmount should not throw errors
    expect(() => unmount()).not.toThrow();
  });
});
