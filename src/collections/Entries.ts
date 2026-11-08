import type { CollectionConfig } from 'payload'
import { dayValidate, ownerAccess, ownerField, signedInAppUser, stampOwner } from './access'

export const Entries: CollectionConfig = {
  slug: 'entries',
  admin: { useAsTitle: 'description', group: 'App data' },
  access: { create: signedInAppUser, read: ownerAccess, update: ownerAccess, delete: ownerAccess },
  hooks: { beforeValidate: [stampOwner] },
  fields: [
    ownerField,
    { name: 'date', type: 'text', required: true, index: true, validate: dayValidate },
    { name: 'type', type: 'select', required: true, options: ['income', 'expense'] },
    { name: 'description', type: 'text', required: true },
    { name: 'amount', type: 'number', required: true, min: 0 },
    { name: 'source', type: 'select', defaultValue: 'manual', options: ['manual', 'paypal'] },
    { name: 'externalId', type: 'text', index: true },
  ],
}
