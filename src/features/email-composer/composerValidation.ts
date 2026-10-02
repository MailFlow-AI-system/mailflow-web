import { COMPOSITION_VALIDATION_MESSAGES } from './composerValidationConstants'
import { compositionSchema } from './schemas/compositionSchema'
import type {
  CompositionValidationInput,
  CompositionValidationIssue,
  CompositionValidationResult,
  CompositionWarning,
} from './types/CompositionValidation'

function getWarnings(input: CompositionValidationInput): CompositionWarning[] {
  const warnings: CompositionWarning[] = []

  if (input.subject.trim() === '') {
    warnings.push({
      code: 'empty-subject',
      field: 'subject',
      message: COMPOSITION_VALIDATION_MESSAGES.emptySubject,
    })
  }

  if (!input.hasBodyContent) {
    warnings.push({
      code: 'empty-body',
      field: 'body',
      message: COMPOSITION_VALIDATION_MESSAGES.emptyBody,
    })
  }

  return warnings
}

function mapIssue(issue: { path: PropertyKey[]; message: string }): CompositionValidationIssue {
  const field = issue.path[0]

  if (field === 'to' || field === 'cc' || field === 'bcc') {
    return { field, message: issue.message }
  }

  const attachmentIndex = issue.path[1]
  return {
    field: 'attachments',
    message: issue.message,
    ...(typeof attachmentIndex === 'number' ? { attachmentIndex } : {}),
  }
}

export function validateComposition(
  input: CompositionValidationInput,
): CompositionValidationResult {
  const warnings = getWarnings(input)
  const parsed = compositionSchema.safeParse(input)

  if (!parsed.success) {
    const [firstIssue, ...remainingIssues] = parsed.error.issues.map(mapIssue)
    return { success: false, issues: [firstIssue, ...remainingIssues], warnings }
  }

  const { to, cc, bcc, subject, body, attachments } = parsed.data
  return {
    success: true,
    issues: [],
    warnings,
    composition: { to, cc, bcc, subject, body, attachments },
  }
}
