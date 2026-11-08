import type { CollectionConfig } from 'payload'
import { dayValidate, ownerAccess, ownerField, signedInAppUser, stampOwner } from './access'

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: { useAsTitle: 'name', group: 'App data' },
  access: { create: signedInAppUser, read: ownerAccess, update: ownerAccess, delete: ownerAccess },
  hooks: { beforeValidate: [stampOwner] },
  fields: [
    ownerField,
    { name: 'name', type: 'text', required: true },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'Other',
      options: ['Streaming', 'Software', 'Shopping', 'Utilities', 'Other'],
    },
    { name: 'amount', type: 'number', min: 0, required: true },
    { name: 'renewDate', type: 'text', validate: (v: unknown) => (!v ? true : dayValidate(v)) },
    { name: 'terminationDate', type: 'text', validate: (v: unknown) => (!v ? true : dayValidate(v)) },
    { name: 'status', type: 'select', defaultValue: 'active', options: ['active', 'cancelled'] },
    { name: 'tag', type: 'text' },
    { name: 'note', type: 'textarea' },
    { name: 'source', type: 'select', defaultValue: 'manual', options: ['manual', 'paypal'] },
    { name: 'externalId', type: 'text', index: true },
    { name: 'paypalSubscriptionId', type: 'text' },
    { name: 'paypalAccountId', type: 'text', index: true },
    { name: 'originalCurrency', type: 'text' },
    { name: 'originalAmount', type: 'number' },
  ],
}
