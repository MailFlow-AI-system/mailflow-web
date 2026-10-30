import { toast } from '@mailflow/ui/components'

export function showFeatureUnavailable() {
  toast.warning('Esta funcionalidade está em desenvolvimento e ainda não está disponível.', {
    id: 'feature-unavailable',
  })
}
