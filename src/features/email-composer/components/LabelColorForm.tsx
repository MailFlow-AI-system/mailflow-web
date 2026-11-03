import { Button } from '@mailflow/ui/components'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { MailLabelBadges } from '#/features/mail-labels/MailLabelBadges'
import { createLabel, fetchLabelPalette, type MailLabel } from '../clients/labels'
import type { MailDeliveryScope } from '../types/EmailDelivery'

const colorNames: Record<string, string> = {
  '#2563eb': 'Azul',
  '#dc2626': 'Vermelho',
  '#16a34a': 'Verde',
  '#9333ea': 'Roxo',
  '#ea580c': 'Laranja',
  '#0891b2': 'Ciano',
  '#be185d': 'Rosa',
  '#4f46e5': 'Índigo',
}

export function LabelColorForm({
  name,
  scope,
  onCreated,
  onBack,
}: {
  name: string
  scope: MailDeliveryScope
  onCreated: (label: MailLabel) => void
  onBack: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const submitting = useRef(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>()
  const palette = useQuery({
    queryKey: ['composer-label-palette', scope.userId, scope.workspace.id],
    queryFn: ({ signal }) => fetchLabelPalette(scope, signal),
    retry: false,
  })
  const color = selectedColor ?? palette.data?.suggestedColor
  useEffect(() => heading.current?.focus(), [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!color || submitting.current) return
    submitting.current = true
    setSaving(true)
    setFailed(false)
    try {
      onCreated(await createLabel(scope, name, color))
    } catch {
      setFailed(true)
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <form className="grid gap-3" onSubmit={(event) => void save(event)}>
      <h3 ref={heading} tabIndex={-1} className="font-semibold outline-none">
        Nova etiqueta
      </h3>
      {palette.isError && !palette.data ? (
        <Button type="button" variant="outline" onClick={() => void palette.refetch()}>
          Tentar carregar cores novamente
        </Button>
      ) : palette.data ? (
        <fieldset disabled={saving}>
          <legend className="mb-2 text-sm">Cor da etiqueta</legend>
          <div className="flex flex-wrap gap-2">
            {palette.data.colors.map((swatch) => (
              <label key={swatch} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="label-color"
                  value={swatch}
                  checked={color === swatch}
                  onChange={() => setSelectedColor(swatch)}
                  className="peer sr-only"
                  aria-label={colorNames[swatch] ?? swatch}
                />
                <span
                  className="grid size-8 place-items-center rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                  style={{ backgroundColor: swatch }}
                >
                  {color === swatch && <Check aria-hidden="true" className="size-4 text-white" />}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p role="status">Carregando cores…</p>
      )}
      {color && (
        <div>
          <p className="text-sm">Prévia da etiqueta</p>
          <MailLabelBadges labels={[{ id: 'preview', name, color }]} />
        </div>
      )}
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível criar a etiqueta. Tente novamente.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          Voltar
        </Button>
        <Button type="submit" disabled={!color || saving}>
          {saving ? 'Criando…' : 'Criar etiqueta'}
        </Button>
      </div>
    </form>
  )
}
