export const DEFAULT_INVOICE_PAYMENT = Object.freeze({
  accountName: 'WISCODE INNOVATIONS LTD',
  bank: 'Moniepoint',
  accountNumber: '6823962380',
  phone: '2348081571801',
});

export function invoicePaymentDetails(details = DEFAULT_INVOICE_PAYMENT) {
  const values = { ...DEFAULT_INVOICE_PAYMENT, ...details };
  for (const key of Object.keys(DEFAULT_INVOICE_PAYMENT)) values[key] = String(values[key] ?? '').trim();
  if (!values.accountName || !values.bank) throw new Error('Enter the account name and bank for this invoice.');
  if (!/^\d{10}$/.test(values.accountNumber)) throw new Error('Enter a valid 10-digit account number for this invoice.');
  return values;
}
