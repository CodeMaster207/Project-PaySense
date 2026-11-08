import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email', group: 'App data' },
  access: {
    create: () => true,
    read: ({ req: { user } }) => {
      if (user?.collection === 'admins') return true
      if (user?.collection === 'users') return { id: { equals: user.id } }
      return false
    },
    update: ({ req: { user } }) => {
      if (user?.collection === 'admins') return true
      if (user?.collection === 'users') return { id: { equals: user.id } }
      return false
    },
    delete: ({ req: { user } }) => user?.collection === 'admins',
    admin: () => false,
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'MYR',
      options: ['MYR', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'CNY', 'INR', 'THB', 'JPY', 'IDR'],
    },
    {
      name: 'paypalStatus',
      type: 'select',
      defaultValue: 'disconnected',
      options: ['disconnected', 'connected'],
      access: { create: () => false, update: ({ req }) => req.user?.collection === 'admins' },
    },
    {
      name: 'paypalLastSync',
      type: 'date',
      access: { create: () => false, update: ({ req }) => req.user?.collection === 'admins' },
    },
    // Largest task (RM) the payments agent may pay without asking. 0 means it always asks first. Server-set only.
    { name: 'autopayLimit', type: 'number', min: 0, defaultValue: 0, access: { create: () => false, update: () => false } },
    // Lets the follow-up agent send overdue-invoice reminders itself when payment requests are checked. Off by default. Server-set only.
    { name: 'autoFollowUp', type: 'checkbox', defaultValue: false, access: { create: () => false, update: () => false } },
    // AI account the user connected. Written only by the server (overrideAccess); the key is encrypted and never readable through the API.
    {
      name: 'aiProvider',
      type: 'select',
      options: ['openai', 'anthropic', 'gemini'],
      access: { create: () => false, update: () => false },
    },
    { name: 'aiAuth', type: 'select', options: ['key', 'google'], access: { create: () => false, update: () => false } },
    { name: 'aiModel', type: 'text', access: { create: () => false, update: () => false } },
    { name: 'aiKeyHint', type: 'text', access: { create: () => false, update: () => false } },
    {
      name: 'aiKeyEnc',
      type: 'text',
      access: { create: () => false, read: () => false, update: () => false },
      admin: { hidden: true },
    },
  ],
}
