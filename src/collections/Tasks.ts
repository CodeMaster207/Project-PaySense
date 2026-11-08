import type { CollectionConfig } from 'payload'
import { dayValidate, ownerAccess, ownerField } from './access'

/**
 * Work you pay someone for once it is done. Written only by the server, so a task can never be marked paid
 * (or its payee or amount changed) from the browser; every change goes through a checked server action.
 */
export const Tasks: CollectionConfig = {
  slug: 'tasks',
  admin: { useAsTitle: 'title', group: 'App data' },
  access: { create: () => false, read: ownerAccess, update: () => false, delete: ownerAccess },
  fields: [
    ownerField,
    { name: 'title', type: 'text', required: true },
    { name: 'payeeName', type: 'text', required: true },
    { name: 'payeeContact', type: 'text', required: true },
    { name: 'amount', type: 'number', required: true, min: 0.01 },
    { name: 'status', type: 'select', defaultValue: 'open', options: ['open', 'review', 'held', 'paying', 'paid'] },
    { name: 'deliveryNote', type: 'textarea' },
    { name: 'verdict', type: 'select', options: ['pay', 'hold'] },
    { name: 'reason', type: 'text' },
    { name: 'reviewedByAi', type: 'checkbox', defaultValue: false },
    { name: 'paidVia', type: 'select', options: ['autopay', 'approved', 'override'] },
    { name: 'paidDate', type: 'text', validate: (v: unknown) => (!v ? true : dayValidate(v)) },
    { name: 'payoutRef', type: 'text' },
  ],
}
