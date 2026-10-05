export type MailCollectionPath = '/inbox' | '/sent' | '/drafts' | '/starred' | '/spam' | '/trash'
export type LoginSearch = { returnTo?: MailCollectionPath }
export type LoginFormProps = { returnTo?: MailCollectionPath }
export type AuthenticatedNavigation = { location: { pathname: string }; clearFragment?: boolean }
export type LoginNavigation = { search: LoginSearch }
