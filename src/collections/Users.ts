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
  ],
}
