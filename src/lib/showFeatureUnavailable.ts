import { toast } from '@mailflow/ui/components'

export function showFeatureUnavailable() {
  toast.warning('This feature is under development and is not available yet.', {
    id: 'feature-unavailable',
  })
}
