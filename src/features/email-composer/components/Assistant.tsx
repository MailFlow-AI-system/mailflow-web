import { Button } from '@mailflow/ui/components'
import { Languages, ScanText, Sparkles, SpellCheck, WandSparkles } from '@mailflow/ui/icons'

const actions = [
  { icon: WandSparkles, label: 'Escrever email' },
  { icon: ScanText, label: 'Melhorar texto' },
  { icon: Sparkles, label: 'Mais persuasivo' },
  { icon: SpellCheck, label: 'Corrigir gramática' },
  { icon: ScanText, label: 'Resumir' },
  { icon: Languages, label: 'Traduzir' },
  { icon: WandSparkles, label: 'Gerar assunto' },
  { icon: Sparkles, label: 'Gerar CTA' },
]

export function Assistant() {
  return (
    <aside
      aria-label="AI Assistente"
      className="hidden flex-col gap-1 border-l border-border bg-muted/20 p-3 md:flex"
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
        <h2 className="text-xs font-medium">AI Assistente</h2>
      </div>
      {actions.map(({ icon: Icon, label }) => (
        <Button
          key={label}
          variant="ghost"
          size="sm"
          aria-disabled="true"
          title="Disponível em uma próxima etapa"
          className="justify-start gap-2 text-xs font-normal text-muted-foreground"
        >
          <Icon aria-hidden="true" className="size-3.5 text-primary" />
          {label}
        </Button>
      ))}
    </aside>
  )
}
