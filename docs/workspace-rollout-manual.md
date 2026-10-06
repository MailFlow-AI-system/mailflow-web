# Workspace Management — etapa real, deixada por último

Status: **não executada e não liberada para usuários reais**. Por decisão do
desenvolvedor, concluir a validação local primeiro e retomar esta etapa com ajuda
guiada. Nenhum item abaixo implica autorização para deploy, DNS ou secrets.

## O que precisaremos confirmar juntos

- Zona base do Web e origem do Site/Core para development, staging e production.
  Cada ambiente terá seu próprio banco, credenciais e fronteira de sessão.
- Quem controla DNS, certificados, Workers routes/domains, Railway e Infisical;
  acessos devem ser feitos nos próprios serviços, sem colar tokens/senhas no chat.
- Estratégia de sessão entre subdomínios e origem confiável: parent cookie só
  após aprovar a fronteira e os riscos dos hosts irmãos. Não ampliar CORS
  indiscriminadamente nem confiar em IP/host encaminhado pelo navegador.
- Banco de aceite, responsável por migrations/grants, backup e recuperação.
- Domínio/remetente de e-mail verificados e caixa de teste que você possa acessar.
- Destinos reais de Faro/OTLP e responsável pela confirmação no Grafana.

## Ordem de execução quando retomarmos

1. Registrar a topologia aprovada e conferir a viabilidade de DNS/TLS/rotas,
   incluindo o host base, tenants, hosts alternativos e isolamento entre ambientes.
2. Fechar a implementação de continuidade/origins para essa topologia e testá-la.
   **Os flags de switching atuais são exclusivamente locais**:
   `WORKSPACE_LOCAL_SWITCHING_ENABLED` e
   `VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED` não são um atalho de produção.
   A entrada genérica/troca em hosts reais depende desse trabalho; não basta
   habilitar os flags ou substituir `workspace.test` por um domínio real.
3. Revisar/abrir os PRs coordenados Core/Web/Site e a ordem de integração.
   Validar os refs aprovados; não promover apenas um consumidor da pilha.
4. Fazer backup e aplicar as migrations IdentityWorkspace na ordem final com
   o migration owner. Conferir FORCE RLS e grants/funções; API/worker usam
   role restrita, sem owner/SUPERUSER/BYPASSRLS. Não usar fixtures/reset de teste.
5. Conferir a configuração por ambiente. Core usa valores de runtime; valores
   públicos `VITE_*` e `PUBLIC_*` precisam estar corretos no build. Alterar
   Infisical sozinho não atualiza um bundle já publicado nem sincroniza
   automaticamente a configuração do build na Cloudflare.
6. Ativar Core/worker compatíveis antes dos consumidores, manter signup legado
   aberto inicialmente e validar entrega/retry OTP e welcome com e-mail real.
   Usar o checklist de onboarding no Core/Site para os flags de cutover.
7. Fazer o smoke real: signup → OTP → login, A → B, refresh, logout/login,
   URL explícita versus preferência, duas abas, revogação, host não autorizado,
   composer/cancelamento, mobile/teclado, caches privados e cookie por ambiente.
8. Verificar ingestão/correlação no Grafana e revisar as dimensões sanitizadas.
   Aprovar dashboards/alertas antes de ativá-los; o debug collector local não
   comprova configuração, retenção ou alertas remotos.
9. Só liberar o fluxo e fechar signup legado após o aceite integrado. Registrar
   versões, ambiente, resultados e pendências. No rollback, coordenar consumidor
   e API, manter drenagem/expiração da fila e preservar dados/migrations/RLS.

## Limites que continuam valendo

- `workspace.test`, controles de fixture e credenciais sintéticas nunca vão
  para deploy. Testes locais não certificam o proxy/cookie/DNS real.
- O Inbox global permanece indisponível no modo workspace até outra tarefa
  entregar Mail tenant-aware; este rollout não cria esse backend.
- Migração de usuários antigos, convites/admin/roles novos e backfill de Mail
  exigem escopo/decisões próprios, não serão improvisados durante o deploy.
- Ao retomar, orientar cada ação manual por serviço/tela depois de confirmar
  os valores e alvos exatos; não fornecer comandos destrutivos genéricos.
