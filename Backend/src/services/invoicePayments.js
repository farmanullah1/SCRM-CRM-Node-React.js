import { InvoicePayment } from "../db.js";

/**
 * Recalculate paid, credited and outstanding values from persisted payment
 * rows. Callers must pass the invoice row they intend to update.
 */
export async function recalculateInvoicePayments(invoice, transaction = undefined) {
  const payments = await InvoicePayment.findAll({
    where: { invoiceId: invoice.id },
    transaction
  });
  const paid = payments
    .filter((entry) => entry.kind !== "Credit")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const credits = payments
    .filter((entry) => entry.kind === "Credit")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const balance = Number(
    Math.max(0, Number(invoice.amount || 0) - paid - credits).toFixed(2)
  );

  invoice.amount_paid = Number(paid.toFixed(2));
  invoice.credit_amount = Number(credits.toFixed(2));
  if (balance <= 0.009) {
    invoice.status = "Paid";
    invoice.paid_at = invoice.paid_at || new Date();
  } else if (
    paid + credits > 0 &&
    ["Sent", "Partially Paid", "Overdue"].includes(invoice.status)
  ) {
    invoice.status = "Partially Paid";
    invoice.paid_at = null;
  }
  await invoice.save({ transaction });
  return { paid, credits, balance };
}
