import * as React from "react";
import { render } from "@react-email/render";
import { OrderStatusEmail, type OrderStatusEmailProps } from "../emails/OrderStatusEmail";

// Renders the react-email order-status component to an HTML string that Nodemailer can send.
// Kept separate from the component so lib/orders.ts never imports JSX/React directly.
export function renderOrderEmail(props: OrderStatusEmailProps): Promise<string> {
  return render(<OrderStatusEmail {...props} />);
}

export type { OrderStatusEmailProps };
