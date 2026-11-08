'use client'

import { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { prettyDay } from '@/lib/dates'
import type { SubscriptionView } from '@/lib/types'
import { paysenseTheme } from './gridSetup'

export function SubscriptionsGrid({
  subs,
  dateHeader,
  dateOf,
  selectedId,
  onSelect,
  empty,
}: {
  subs: SubscriptionView[]
  dateHeader: string
  dateOf: (s: SubscriptionView) => string
  selectedId: string | null
  onSelect: (id: string) => void
  empty: string
}) {
  const columns = useMemo<ColDef<SubscriptionView>[]>(
    () => [
      { field: 'name', headerName: 'App/Service', flex: 2, minWidth: 140, filter: 'agTextColumnFilter', cellClass: 'font-bold' },
      { field: 'category', headerName: 'Category', flex: 1, minWidth: 110, filter: 'agTextColumnFilter' },
      {
        headerName: dateHeader,
        flex: 1,
        minWidth: 130,
        valueGetter: (p) => (p.data ? dateOf(p.data) : ''),
        valueFormatter: (p) => (p.value ? prettyDay(p.value) : '-'),
        filter: 'agTextColumnFilter',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        cellRenderer: (p: { data?: SubscriptionView }) =>
          p.data ? (
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.data.status === 'active' ? 'bg-leaf-100 text-leaf-700' : 'bg-berry-100 text-berry-500'}`}>{p.data.status}</span>
          ) : null,
      },
    ],
    [dateHeader, dateOf],
  )

  return (
    <AgGridReact<SubscriptionView>
      theme={paysenseTheme}
      rowData={subs}
      columnDefs={columns}
      defaultColDef={{ sortable: true, resizable: true }}
      getRowId={(p) => p.data.id}
      domLayout="autoHeight"
      rowHeight={44}
      onRowClicked={(e) => e.data && onSelect(e.data.id)}
      getRowClass={(p) => (p.data?.id === selectedId ? 'ag-row-selected-sub' : 'cursor-pointer')}
      overlayNoRowsTemplate={empty}
    />
  )
}
