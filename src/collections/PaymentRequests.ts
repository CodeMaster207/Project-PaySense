import type { CollectionConfig } from 'payload'
import { dayValidate, ownerAccess, ownerField } from './access'

/** Payment requests sent as PayPal invoices. Written only by the server after PayPal accepts the invoice. */
export const PaymentRequests: CollectionConfig = {
  slug: 'payment-requests',
  admin: { useAsTitle: 'description', group: 'App data' },
  access: { create: () => false, read: ownerAccess, update: () => false, delete: ownerAccess },
  fields: [
    ownerField,
    { name: 'recipientEmail', type: 'text', required: true },
    { name: 'amount', type: 'number', required: true, min: 0.01 },
    { name: 'description', type: 'text', required: true },
    { name: 'dueDate', type: 'text', validate: (v: unknown) => (!v ? true : dayValidate(v)) },
    { name: 'invoiceId', type: 'text', required: true, index: true },
    { name: 'status', type: 'select', defaultValue: 'sent', options: ['sent', 'paid', 'cancelled'] },
  ],
}
