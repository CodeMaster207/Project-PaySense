import type { CollectionConfig } from 'payload'
import { dayValidate, ownerAccess, ownerField, signedInAppUser, stampOwner } from './access'

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  admin: { useAsTitle: 'name', group: 'App data' },
  access: { create: signedInAppUser, read: ownerAccess, update: ownerAccess, delete: ownerAccess },
  hooks: { beforeValidate: [stampOwner] },
  fields: [
    ownerField,
    { name: 'name', type: 'text', required: true },
    { name: 'kind', type: 'select', defaultValue: 'job', options: ['job', 'contract'] },
    { name: 'amount', type: 'number', required: true, min: 0.01 },
    {
      name: 'frequency',
      type: 'select',
      required: true,
      defaultValue: 'monthly',
      options: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
    },
    { name: 'startDate', type: 'text', required: true, validate: dayValidate },
    {
      name: 'endDate',
      type: 'text',
      admin: { description: 'Leave empty for an indefinite job.' },
      validate: (v: unknown) => (!v ? true : dayValidate(v)),
    },
  ],
}
