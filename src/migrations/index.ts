import * as migration_20261108_113655_initial from './20261108_113655_initial';
import * as migration_20261108_114815_paypal_account_id from './20261108_114815_paypal_account_id';

export const migrations = [
  {
    up: migration_20261108_113655_initial.up,
    down: migration_20261108_113655_initial.down,
    name: '20261108_113655_initial',
  },
  {
    up: migration_20261108_114815_paypal_account_id.up,
    down: migration_20261108_114815_paypal_account_id.down,
    name: '20261108_114815_paypal_account_id'
  },
];
