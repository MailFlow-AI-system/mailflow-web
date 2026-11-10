import { Button } from '@mailflow/ui/components'
import { Languages, ScanText, Sparkles, SpellCheck, WandSparkles } from '@mailflow/ui/icons'
import { showFeatureUnavailable } from '#/lib/showFeatureUnavailable'

const actions = [
  { icon: WandSparkles, label: 'Write email' },
  { icon: ScanText, label: 'Improve text' },
  { icon: Sparkles, label: 'More persuasive' },
  { icon: SpellCheck, label: 'Fix grammar' },
  { icon: ScanText, label: 'Summarize' },
  { icon: Languages, label: 'Translate' },
  { icon: WandSparkles, label: 'Generate subject' },
  { icon: Sparkles, label: 'Generate CTA' },
]

export function Assistant() {
  return (
    <aside
      aria-label="AI Assistant"
      className="hidden flex-col gap-1 border-l border-border bg-muted/20 p-3 md:flex"
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
        <h2 className="text-xs font-medium">AI Assistant</h2>
      </div>
      {actions.map(({ icon: Icon, label }) => (
        <Button
          key={label}
          variant="ghost"
          size="sm"
          onClick={showFeatureUnavailable}
          type="button"
          title="Available in a later release"
          className="justify-start gap-2 text-xs font-normal text-muted-foreground"
        >
          <Icon aria-hidden="true" className="size-3.5 text-primary" />
          {label}
        </Button>
      ))}
    </aside>
  )
}
