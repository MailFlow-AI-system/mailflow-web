import { Assistant } from './Assistant'
import { Attachments } from './Attachments'
import { CloseConfirmation } from './CloseConfirmation'
import { Editor } from './Editor'
import { Fields } from './Fields'
import { Footer } from './Footer'
import { FormattingToolbar } from './FormattingToolbar'
import { Root } from './Root'
import { Content, Header, Layout, Minimized, Trigger } from './Surface'

export const EmailComposer = {
  Root,
  Trigger,
  Content,
  Header,
  Layout,
  Fields,
  Editor,
  Toolbar: FormattingToolbar,
  Attachments,
  Footer,
  Assistant,
  Minimized,
  CloseConfirmation,
}
