import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { observer } from "mobx-react";
import { describe, it } from "vitest";
import { z } from "zod";

import { TextInput } from "./TextInput";
import { useForm } from "../src";

const DiscrimiatedUnionForm = observer(() => {
  const form = useForm(
    z.object({
      payment: z.discriminatedUnion("type", [
        z.object({
          type: z.literal("credit_card"),
          card_number: z
            .string()
            .regex(/^\d{16}$/)
            .label("Card Number"),
          card_holder_name: z.string().min(1).label("Card Holder Name"),
          expiration_date: z
            .string()
            .regex(/^\d{2}\/\d{2}$/)
            .label("Expiration Date"),
          cvv: z.string().length(3).label("CVV"),
          billing_dddress: z.string().min(1).label("Billing Address"),
          postal_code: z.string().min(5).max(10).label("Postal Code"),
        }),
        z.object({
          type: z.literal("paypal"),
          email: z.string().email().label("Email"),
        }),
      ]),
    }),
  );

  const {
    fields: { payment },
  } = form.root;

  return (
    <form
      {...form.bindForm({ onSubmit: console.info })}
      style={{ border: `1px solid black` }}
    >
      <select
        value={payment.discriminatorField.rawInput as string}
        onChange={(e) =>
          payment.discriminatorField.setOutput(e.target.value as any)
        }
      >
        <option value="credit_card">credit_card</option>
        <option value="paypal">paypal</option>
      </select>

      <label>
        <input
          type="radio"
          {...form.bindField(payment.discriminatorField, {
            type: "radio",
            value: "credit_card",
          })}
        />
        credit_card
      </label>

      <label>
        <input
          type="radio"
          {...form.bindField(payment.discriminatorField, {
            type: "radio",
            value: "paypal",
          })}
        />
        paypal
      </label>

      {payment.fieldsResult.success && (
        <>
          {payment.fieldsResult.fields.discriminator === "credit_card" && (
            <>
              <h3>credit card</h3>

              <TextInput field={payment.fieldsResult.fields.card_number} />
              <TextInput field={payment.fieldsResult.fields.card_holder_name} />
              <TextInput field={payment.fieldsResult.fields.cvv} />
              <TextInput field={payment.fieldsResult.fields.expiration_date} />
              <TextInput field={payment.fieldsResult.fields.billing_dddress} />
              <TextInput field={payment.fieldsResult.fields.postal_code} />
            </>
          )}

          {payment.fieldsResult.fields.discriminator === "paypal" && (
            <>
              <h3>paypal</h3>

              <TextInput field={payment.fieldsResult.fields.email} />
            </>
          )}
        </>
      )}

      <button type="submit">Submit</button>
    </form>
  );
});

describe("discrimiatedUnion", () => {
  it("renders DiscrimiatedUnionForm", () => {
    render(<DiscrimiatedUnionForm />);
  });

  it("render credit card by default", async () => {
    render(<DiscrimiatedUnionForm />);

    await screen.findByText("credit card", {
      selector: "h3",
    });
  });

  it("display errors", async () => {
    render(<DiscrimiatedUnionForm />);

    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("CVV"), "22");

    // Click away
    await user.click(document.body);
    await screen.findByText("String must contain exactly 3 character(s)");
  });

  it("switch by select", async () => {
    render(<DiscrimiatedUnionForm />);

    const user = userEvent.setup();

    // Switch to credit card

    await userEvent.selectOptions(screen.getByRole("combobox"), ["paypal"]);

    await screen.findByText("paypal", {
      selector: "h3",
    });

    await user.type(await screen.findByLabelText("Email"), "not-a-email");
    await user.click(document.body);

    await screen.findByText("Invalid email");

    // Return to credit card

    await userEvent.selectOptions(screen.getByRole("combobox"), [
      "credit_card",
    ]);

    await screen.findByText("credit card", {
      selector: "h3",
    });

    await user.type(await screen.findByLabelText("CVV"), "22");

    // Click away
    await user.click(document.body);
    await screen.findByText("String must contain exactly 3 character(s)");
  });

  it("switch by radio", async () => {
    render(<DiscrimiatedUnionForm />);

    userEvent.setup();

    await userEvent.click(await screen.findByLabelText("paypal"));

    await screen.findByText("paypal", {
      selector: "h3",
    });
  });
});
