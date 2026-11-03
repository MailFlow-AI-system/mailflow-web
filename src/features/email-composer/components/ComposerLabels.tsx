import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  LabelPicker,
} from '@mailflow/ui/components'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Tag, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type MailLabel, searchLabels } from '../clients/labels'
import { useComposer } from '../context'
import type { MailDeliveryScope } from '../types/EmailDelivery'
import { LabelColorForm } from './LabelColorForm'

function LabelOptions({
  scope,
  items,
  setItems,
}: {
  scope: MailDeliveryScope
  items: MailLabel[]
  setItems: (items: MailLabel[]) => void
}) {
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState<string | null>(null)
  const pendingCreation = useRef<{
    resolve: (label: MailLabel) => void
    reject: () => void
  } | null>(null)
  const restoreSearchFocus = useRef(false)
  useEffect(
    () => () => {
      pendingCreation.current?.reject()
      pendingCreation.current = null
    },
    [],
  )
  const queryClient = useQueryClient()
  const scopeKey = ['composer-labels', scope.userId, scope.workspace.id]
  const pages = useInfiniteQuery({
    queryKey: [...scopeKey, query],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => searchLabels(scope, query, pageParam, signal),
    getNextPageParam: (last) => last.nextCursor,
    retry: false,
  })
  const data = pages.data?.pages
  const results = data
    ? {
        query,
        items: data.flatMap((page) => page.items),
        hasMore: pages.hasNextPage,
        exactMatch: data[0].exactMatch,
      }
    : null

  if (newName) {
    return (
      <LabelColorForm
        name={newName}
        scope={scope}
        onCreated={(label) => {
          if (!pendingCreation.current) return
          pendingCreation.current.resolve(label)
          pendingCreation.current = null
          restoreSearchFocus.current = true
          setNewName(null)
          void queryClient.invalidateQueries({ queryKey: scopeKey })
          void queryClient.invalidateQueries({
            queryKey: ['composer-label-palette', scope.userId, scope.workspace.id],
          })
        }}
        onBack={() => {
          pendingCreation.current?.reject()
          pendingCreation.current = null
          restoreSearchFocus.current = true
          setNewName(null)
        }}
      />
    )
  }

  return (
    <>
      <div
        ref={(node) => {
          if (node && restoreSearchFocus.current) {
            restoreSearchFocus.current = false
            node.querySelector('input')?.focus()
          }
        }}
      >
        <LabelPicker
          aria-label="Buscar etiquetas"
          value={null}
          query={query}
          onQueryChange={setQuery}
          results={pages.isRefetching || pages.isRefetchError ? null : results}
          loadingMore={pages.isFetchingNextPage}
          onLoadMore={() => void pages.fetchNextPage({ cancelRefetch: false })}
          onValueChange={(label) => {
            if (!items.some((item) => item.id === label.id)) setItems([...items, label])
            setQuery('')
          }}
          onCreate={(name) =>
            new Promise((resolve, reject) => {
              pendingCreation.current = { resolve, reject }
              setNewName(name)
            })
          }
        />
      </div>
      {pages.isError && (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void (pages.isFetchNextPageError ? pages.fetchNextPage() : pages.refetch())
          }
        >
          Tentar carregar etiquetas novamente
        </Button>
      )}
      <ul aria-label="Etiquetas selecionadas" className="flex flex-wrap gap-2">
        {items.map((label) => (
          <li key={label.id}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Remover etiqueta ${label.name}`}
              onClick={() => setItems(items.filter((item) => item.id !== label.id))}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
              {label.name} ×
            </Button>
          </li>
        ))}
      </ul>
      <AlertDialogClose render={<Button type="button" />}>Concluir</AlertDialogClose>
    </>
  )
}

export function ComposerLabels() {
  const { labels, sending } = useComposer()
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<MailDeliveryScope | null>(null)
  const [failed, setFailed] = useState(false)
  if (!labels) return null

  function loadScope() {
    setFailed(false)
    setScope(null)
    void labels?.resolveScope().then(setScope, () => setFailed(true))
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) loadScope()
      }}
    >
      <AlertDialogTrigger
        render={<Button type="button" variant="outline" size="sm" disabled={sending} />}
      >
        <Tag aria-hidden="true" className="size-4" />
        Etiquetas{labels.items.length ? ` (${labels.items.length})` : ''}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <div className="flex items-center justify-between gap-2">
          <AlertDialogTitle>Etiquetas</AlertDialogTitle>
          <AlertDialogClose
            render={
              <Button type="button" variant="ghost" size="icon" aria-label="Fechar etiquetas" />
            }
          >
            <X aria-hidden="true" className="size-4" />
          </AlertDialogClose>
        </div>
        <AlertDialogDescription>
          Escolha as etiquetas para esta mensagem enviada.
        </AlertDialogDescription>
        {scope ? (
          <LabelOptions scope={scope} items={labels.items} setItems={labels.setItems} />
        ) : failed ? (
          <Button type="button" variant="outline" onClick={loadScope}>
            Tentar carregar workspace novamente
          </Button>
        ) : (
          <p role="status">Carregando workspace…</p>
        )}
        {!scope && <AlertDialogClose render={<Button type="button" />}>Concluir</AlertDialogClose>}
      </AlertDialogContent>
    </AlertDialog>
  )
}
