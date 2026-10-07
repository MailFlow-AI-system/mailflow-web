# Workspace Management — resultado do QA local

## Conclusão

Em 2026-10-07, o fluxo funcional de workspace passou nos testes locais com
Playwright/Chromium, Core real, autenticação real e PostgreSQL isolado.
**O aceite visual/humano continua parcial; isso não libera deploy.**

Não foi usado Computer Use. Não foram alterados componentes ou regras da
aplicação, nem feitos push/deploy, envs reais, DNS, secrets ou envios reais de
email. As mudanças desta rodada são testes e documentação no Web.

Bases: Core `7116d89`, Web `a99dcb5`, Site `6082242`. Foram adicionados seis
cenários de QA e reforçada a verificação de corpo/anexo após falha de troca.
O [roteiro manual](workspace-qa-manual.md) foi corrigido para refletir os limites
reais dos itens Sent e Theme, descritos abaixo.

## Execuções e resultados

Foram aprovados **42 testes E2E distintos**, em execuções separadas:

- Workspace existente: **23/23**, 4,5 minutos, um worker, zero retries/skips.
- Complemento final: **7/7**, 1,1 minuto. São seis cenários novos e a reexecução
  de um dos 23 existentes, agora verificando assunto, corpo e anexo após falha
  e revogação. Esse teste repetido não foi contado duas vezes no total de 42.
- Web legado/composer/auth: **10/10**, 30,2 segundos, seis workers, zero retries.
  Essa suíte usa seu auth double, não o Core real da suíte de workspace.
- Site → Core → Web onboarding: **2/2**, 33,5 segundos, desktop/mobile. Signup,
  refresh/resend, OTP capturado, verificação, login explícito e workspace correto.
  A entrega de email é um provider double; não comprova recebimento em caixa real.
- Telemetria local: **1/1**, 28,8 segundos. Faro real, traceparent do navegador,
  Core e collector OTLP local correlacionados para sucesso, acesso negado, falha,
  indisponibilidade e 429. Privacidade e retenção do rascunho verificadas.
  Falha/indisponibilidade são injetadas; o limite de requisições é real.

Os 29 cenários distintos de workspace foram cobertos pela execução completa
inicial de 23 e pelo complemento final de sete; não foi uma execução única dos
29 juntos. Nenhum teste foi removido, ignorado ou aprovado com retry automático.

Checks completos aprovados nos três projetos:

- Core: lint, formatação, typecheck, **173 testes / 39 arquivos**, build.
  Suítes de integração de banco/auth/mail habilitadas no banco local isolado.
- Web: lint, formatação, typecheck, **299 testes / 62 arquivos**, build com
  workspace habilitado para a zona sintética local.
- Site: lint, formatação, Astro check sem erros/warnings/hints,
  **49 testes / 11 arquivos**, build com onboarding habilitado e três Wrangler
  **dry-runs**. Nenhum deploy foi executado.

### Falha inicial preservada no registro

A primeira execução dos quatro cenários novos de teclado/paleta teve três
aprovados e uma falha: o Compose ainda estava desabilitado aos cinco segundos
durante a hidratação fria de desenvolvimento. O trace mostrou `/inbox`, login,
contexto e listagem com HTTP 200, nenhum HTTP 5xx e 415 módulos carregados.

O teste foi corrigido para aguardar o estado habilitado com o mesmo teto local
de prontidão de **30 segundos** já usado no teste de startup. Não foi adicionado
sleep, retry, bypass de auth ou mudança de comportamento da aplicação.
Uma nova execução dos quatro passou em 48,3 segundos; o complemento final de
sete também passou. O trace da falha permanece em artefato local ignorado.

O startup simultâneo de seis páginas A/B passou, com prontidão entre **10,264 e
11,180 segundos** nesta máquina. Inclui compilação/hidratação de Vite dev; não
é benchmark de produção, SLO ou garantia de ausência de toda corrida de SSR.

## Correspondência com o roteiro

"Validado automaticamente" abaixo significa asserções de comportamento no
navegador, não execução humana nem aprovação estética.

- **QA-01 — validado:** login, lista autorizada e marcador atual
  `aria-selected`; Acme e Northwind, sem Globex para o usuário principal.
- **QA-02 — validado pela URL:** `/sent` preservado ao trocar A → B;
  query/fragment privados removidos. Não aprova o item Sent da sidebar.
- **QA-03 — validado:** refresh mantém host/contexto autorizado de B.
- **QA-04 — validado:** logout/login genérico retoma B; URL explícita de A
  prevalece sem sobrescrever a preferência apenas por visitar a página.
- **QA-05 — validado:** abas A/B independentes, refresh concorrente e preferência
  sem uso de organização ativa global da sessão.
- **QA-06 — validado:** cancelar mantém assunto/corpo/anexo de rascunho salvo
  localmente e minimizado, sem escrever seleção; foco inicial no cancelamento.
- **QA-07 — validado:** confirmar troca descarta o rascunho/anexo somente após
  sucesso autorizado; o composer do destino inicia vazio.
- **QA-08 — validado:** host/ID não autorizado negados, sem fallback silencioso
  para a preferência e sem carga do Mail global.
- **QA-09 — validado:** logout e outra identidade não reutilizam lista/cache
  da anterior; respostas atrasadas também são rejeitadas.
- **QA-10 — validado:** conta sem associação recebe estado vazio, sem Compose,
  seletor indevido ou Mail global; Axe e viewport pequeno verificados.
- **QA-11 — parcialmente validado:** Tab/Enter/setas/Home/End/Escape, retorno de
  foco, cancelamento por teclado, marcador atual, duas paletas, desktop
  1440×900/mobile 390×844 e toque emulado. Sem overflow horizontal; Axe sem
  violações nos recortes de menu e confirmação. Avaliação humana, leitor de tela,
  aparelho real e consistência visual completa continuam pendentes.
- **QA-12 — validado:** falha de escrita mantém host/preferência e assunto,
  corpo/anexo. Erro de 429 também preserva rascunho e anuncia espera.
- **QA-13 — validado:** associação revogada bloqueia B, inclusive ao recuperar
  foco; A continua válido e entrada genérica não usa preferência sem autorização.
- **QA-14 — validado:** expiração remove autoridade antiga e exige login;
  recuperação também testada em revalidação sem refresh manual.

## Achados e limites visuais

1. **Diálogo/composer escuros no shell claro.** As capturas mostram a confirmação
   e a janela minimizada em dark, mesmo com `html[data-theme="light"]`. O
   composer tem tema dark padrão na composição atual, e a confirmação usa esse
   tema. Axe passar não elimina essa inconsistência. Não foi corrigida nesta
   rodada; decidir/ajustar o acompanhamento do tema antes do aceite visual.
2. **Sent e Theme não são ações funcionais na sidebar.** Os itens atuais estão
   desabilitados. `/sent` existe e foi testado por URL; só Inbox está habilitado
   na navegação. Paleta light foi selecionada pelo storage do DS
   (`mailflow-theme`), não por um toggle funcional. São limites observados do
   shell existente, não funcionalidades aprovadas pelo QA de workspace.
3. **Não há certificação visual pixel a pixel.** Foi consultada a referência
   read-only `mailflow-ai-suite/src/components/app-sidebar.tsx` e inspecionadas
   capturas reais do Web. Lovable usa opções mockadas e não oferece o fluxo
   real de autorização/confirmar descarte. Não foi renderizada uma comparação
   lado a lado do Lovable nesta rodada, nem alterados tokens/componentes do DS.

As capturas finais ficam em `workspace-switching-test-results/qa-20261007-final/`:

- [Menu desktop claro](../workspace-switching-test-results/qa-20261007-final/qaAcceptance-desktop-light-d9df5-ion-and-responsive-palettes/qa-selector.png).
- [Menu mobile escuro](../workspace-switching-test-results/qa-20261007-final/qaAcceptance-mobile-dark-Q-65ecc-ion-and-responsive-palettes/qa-selector.png).
- [Confirmação desktop no shell claro](../workspace-switching-test-results/qa-20261007-final/qaAcceptance-desktop-light-d9df5-ion-and-responsive-palettes/qa-confirmation.png).
- [Confirmação mobile no shell claro](../workspace-switching-test-results/qa-20261007-final/qaAcceptance-mobile-light--09f57-ion-and-responsive-palettes/qa-confirmation.png).

São artefatos locais ignorados, não anexos publicados. A faixa magenta é a
máscara do email sintético, não um elemento da interface. O ícone de devtools
também não faz parte do build de produção. Próximas execuções podem limpar os
artefatos; preserve somente evidências sanitizadas para compartilhar.

## O que você ainda precisa validar pessoalmente

Não precisa repetir toda a matriz de segurança clicando manualmente. Priorize:

1. **Olho humano, desktop, claro/escuro:** comparar seletor aberto/fechado,
   nome atual, avatar, alinhamento, fonte, foco e contraste com a referência.
   Conferir se se entende qual workspace está ativo, inclusive sidebar recolhida.
   Resolver a discrepância de tema acima; legibilidade e coerência visual não
   são aprovadas apenas porque o elemento existe no DOM.
2. **Texto e compreensão do descarte:** criar uma mensagem com anexo, minimizar,
   tentar trocar e ler a confirmação. Deve ficar óbvio que ela é local e será
   descartada; Continuar editando deve parecer a alternativa segura.
3. **Zoom/tamanho de texto:** testar desktop em 200% e fonte ampliada. Menu,
   workspace atual, erro e botões não podem ficar cortados ou ilegíveis.
4. **Android/Chrome e iPhone/Safari reais:** abrir sidebar/menu com toque,
   trocar A → B, atualizar, rotacionar retrato/paisagem e abrir o teclado ao
   compor. Conferir alvos de toque, scroll, viewport com teclado, botões visíveis
   e cancelamento sem perder conteúdo. Toque emulado não testa teclado virtual,
   áreas seguras, barras do navegador ou gestos/inércia do aparelho.
5. **Abas/suspensão no telefone:** manter A e B, alternar, colocar o navegador
   em segundo plano e voltar. A aba deve revalidar com a identidade/permissão
   atual, sem trocar seu host porque outra aba mudou a preferência. O SO pode
   descartar uma aba inteira; o rascunho apenas em memória não tem recuperação
   durável prometida nessa situação.
6. **Leitor de tela real:** NVDA no Windows ou VoiceOver no iPhone. Verificar
   anúncio de nome/opção atual do seletor, opções, título/descrição da confirmação,
   erro/espera e retorno de foco. Axe cobre problemas detectáveis no DOM, não a
   pronúncia, clareza dos anúncios ou toda a experiência assistiva.

Dispositivos físicos precisam de um endereço de aceite alcançável e aprovado;
`127.0.0.1`/`workspace.test` deste harness não são automaticamente acessíveis
no telefone. Não exponha fixture/credenciais de teste para viabilizar isso.
Safari/WebKit e Firefox não foram executados nesta rodada.

## Ambiente real e encerramento

Continuam para a etapa combinada por último: domínios/DNS/TLS, continuidade e
isolamento de cookies, proxy/IP confiável, migrations/grants reais, OTP/welcome
em caixa real e Faro/Grafana remoto. Ver
[checklist de rollout](workspace-rollout-manual.md). Não habilitar flags locais
nem substituir a zona sintética como atalho para produção.

O aviso de IP do Better Auth no BFF de onboarding foi observado novamente;
configuração de proxy real permanece gate, não foi mascarada desabilitando rate
limit. A suíte legada também registra indisponibilidade do seu collector fake e
um erro sintético proposital; a ingestão real local foi testada separadamente.

Os servidores dos harnesses foram encerrados. O collector local foi parado,
sem exclusão do container/logs. O banco isolado permanece disponível; outros
ambientes/processos do computador não foram encerrados. Checks/scripts de teste
não substituem o aceite humano registrado e não autorizam deploy.
