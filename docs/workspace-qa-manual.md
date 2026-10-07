# Workspace Management — roteiro de QA local

## Contexto e objetivo

Validar que uma pessoa consegue listar seus workspaces, identificar o atual,
trocar entre eles e retomar sua escolha após refresh e novo login, sem acessar
workspaces de outras pessoas ou perder uma mensagem sem confirmação.

A identidade/login é compartilhada; o workspace desta aba é definido pelo
subdomínio autorizado. A preferência salva é usada na entrada genérica, mas
não muda o workspace de outra aba nem concede acesso.

**Este roteiro não é um resultado de QA.** Preencha os resultados ao executá-lo.
Preparado em 2026-10-07 com Core `7116d89`, Web `def6983` e Site `6082242`.
Os resultados automatizados anteriores estão em
[evidências de validação](workspace-operational-recovery.md).

### O que não deve ser considerado bug nesta tarefa

- No modo workspace, o Inbox exibe **“Workspace mail is not available yet”**.
  O backend de emails ainda não é tenant-aware; não devem aparecer emails globais.
- Compose permite testar a UI e o rascunho local, não envio real de email.
- “Rascunho” não salva a mensagem no servidor. Não se espera recuperar esse
  rascunho após refresh/logout; os cenários abaixo verificam cancelamento e
  falha de troca na mesma aba, sem refresh.
- Convites, gestão de membros/roles, criação adicional de workspaces pela UI
  e migração de usuários antigos não fazem parte deste aceite.
- Cookies, DNS/TLS, email real e deploy exigem outro aceite:
  [checklist de ambiente real](workspace-rollout-manual.md).

## 1. Preparar uma sessão de teste

Esta preparação usa o ambiente isolado já criado neste computador. Não use um
banco real, credenciais pessoais nem os comandos de deploy. Não é necessário
Infisical ou conta Cloudflare para este harness local.

Pré-requisitos: Docker Desktop aberto, Node 24/Bun 1.4.1 e dependências instaladas
nos worktrees abaixo. As portas 55433, 8083 e 3003 precisam estar livres, exceto
pelo banco indicado. Se faltar banco/container ou houver conflito, registre
**Bloqueado — preparação**; não apague processos, bancos ou containers alheios.

### 1.1 Banco — terminal WSL

```bash
'/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe' --context desktop-linux start mailflow-workspace-foundation-db
```

Se o container não existir, peça a preparação do banco isolado antes de continuar.
O servidor abaixo aplica migrations e cria dados sintéticos apenas no banco
local `mailflow_workspace_test`; não substitua sua URL pela de outro ambiente.

### 1.2 Core — primeiro terminal WSL, mantenha aberto

```bash
cd /home/p4van772000/mentoria/mailflow-core-onboarding
export PATH=/home/p4van772000/.npm/_npx/2bc76c6d34c7fe56/node_modules/.bin:$PATH
MAILFLOW_WORKSPACE_TEST_DATABASE_URL=postgresql://workspace_test_admin:workspace_test_local_only@127.0.0.1:55433/mailflow_workspace_test \
bun run test:workspace-switching:server
```

Aguarde **“Workspace switching fixture ready on 127.0.0.1:8083”**.
Essa senha é exclusivamente sintética/local. O servidor cria contas já
verificadas; não há OTP para essas contas. Não publique o endpoint `__fixture`.

### 1.3 Web — segundo terminal WSL, mantenha aberto

```bash
cd /home/p4van772000/.codex/worktrees/workspace-foundation/mailflow-web
export PATH=/home/p4van772000/.npm/_npx/2bc76c6d34c7fe56/node_modules/.bin:$PATH
VITE_API_BASE_URL=http://127.0.0.1:8083 \
VITE_WORKSPACE_BASE_HOST=workspace.test \
VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED=true \
bun run vite dev --port 3003 --host 127.0.0.1
```

Não use `localhost:3000` para este roteiro. Não altere arquivos, nem documentos,
enquanto testa: o Vite pode recarregar as abas e invalidar o resultado.
Os flags e cookies deste harness são **exclusivamente locais**, não de produção.

### 1.4 Navegador — PowerShell do Windows

Abra um Edge com perfil temporário e resolução local de `*.workspace.test`.
Não precisa alterar DNS, arquivo hosts ou seu perfil pessoal:

```powershell
$qaProfile = Join-Path $env:TEMP ("mailflow-workspace-qa-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $qaProfile | Out-Null
$qaEdge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $qaEdge)) { throw "Edge não encontrado; confirme o executável antes de continuar." }
& $qaEdge "--user-data-dir=$qaProfile" "--host-resolver-rules=MAP *.workspace.test 127.0.0.1, MAP workspace.test 127.0.0.1" "http://127.0.0.1:8083/__fixture"
```

Use **essa janela** para todo o roteiro. Se o Windows não conseguir acessar o
Core por loopback/WSL, registre bloqueio de conectividade; não exponha o servidor
em `0.0.0.0` nem desative proteções do navegador para contornar.

O JSON de `http://127.0.0.1:8083/__fixture` informa os dados desta execução:

- `email` + `password`: usuário principal, membro de **Acme Corp (A)** e
  **Northwind (B)**, sem acesso a **Globex (C)**.
- `otherEmail` + a mesma senha: **Other User**, com Northwind e Globex, sem Acme.
- `emptyEmail` + a mesma senha: usuário sem workspace.
- `host`: endereço de A. URL de login: `http://<host>:3003/login`.
- `targetHost`: endereço de B. URL de login: `http://<targetHost>:3003/login`.
- `unrelatedHost`: endereço de C, para testar acesso negado.
- Entrada genérica: `http://workspace.test:3003/login`.

Substitua `<host>` pelo valor completo do JSON, sem os sinais `< >`.
Os slugs/emails mudam quando o Core reinicia; leia novamente os dados nesse caso.
Não fixe `acme.workspace.test` nem escolha um fallback pela ordem dos nomes.

## 2. Roteiro principal — execute nesta ordem

Registre cada cenário como **Passou**, **Falhou** ou **Bloqueado**, com evidência.
Comece com a fixture recém-iniciada, sem preferência e sem rascunhos.

### QA-01 — Login e lista autorizada

1. Entre pela URL de login de A com `email` e `password`.
2. Aguarde o seletor mostrar **Acme Corp**. Abra-o.

Esperado: sidebar/header visíveis; A identificado como atual/selecionado;
Acme Corp e Northwind disponíveis; Globex ausente. Compose habilitado.
O Inbox indisponível é o estado esperado, não uma falha de login.

### QA-02 — Troca sem rascunho e navegação

1. Em A, abra **Sent** pela sidebar.
2. No seletor, escolha **Northwind** sem ter escrito mensagem.
3. Abra o seletor novamente na página de destino.

Esperado: URL muda para `http://<targetHost>:3003/sent`; seletor e opção
selecionada mostram Northwind. Não solicita novo login. Não há confirmação
de descarte para um composer vazio. Contexto de A não permanece como ativo.

### QA-03 — Persistência após refresh

1. Ainda em B, atualize a página.

Esperado: continua no host de B, rota `/sent`, com Northwind selecionado.
Não volta a Acme nem perde a sessão.

### QA-04 — Persistência entre sessões e prioridade da URL

1. Clique no usuário da sidebar e em **Sign out**.
2. Entre novamente pela URL **genérica**, com o usuário principal.
3. Abra diretamente `http://<host>:3003/sent` e atualize.
4. Abra `http://workspace.test:3003/inbox`.

Esperado: no passo 2 retoma B; no passo 3 abre e mantém A, porque a URL explícita
tem prioridade. No passo 4 retoma B novamente: apenas visitar A não deve
sobrescrever a preferência salva. Logout/login comprova uma nova sessão;
não se exige persistência de um rascunho local.

### QA-05 — Abas independentes

1. Na mesma janela/perfil, abra A `/inbox` em uma aba e B `/inbox` em outra.
2. Alterne entre as abas e atualize ambas.
3. Na aba de A, escolha B. Volte à outra aba.

Esperado: antes da troca, uma aba mostra A e a outra B, sem disputa por um
“workspace global”. Trocar uma aba não redireciona a outra. Cada contexto
corresponde ao host autorizado daquela aba.

### QA-06 — Cancelar a troca preserva a mensagem

1. Abra A `/inbox`. Clique em **Compose**.
2. Preencha Assunto com `QA workspace`, escreva no corpo e anexe um arquivo
   inofensivo, sem informações reais.
3. Clique em **Rascunho**, minimize a janela e escolha Northwind no seletor.
4. Leia a confirmação e clique em **Continuar editando**.
5. Restaure a mensagem.

Esperado: confirmação **“Trocar de workspace?”**, explicando descarte de mensagem
e anexos, com foco inicial em Continuar editando. Cancelar mantém host A,
assunto, corpo e anexo. Marcar como Rascunho/minimizar não elimina a proteção.

### QA-07 — Confirmar o descarte e trocar

1. Com a mensagem do cenário anterior, minimize e escolha Northwind novamente.
2. Clique em **Descartar e trocar**. Aguarde concluir.
3. Em B, abra Compose.

Esperado: troca para B somente após a resposta autorizada; mensagem/anexos
anteriores ausentes no novo composer. Enquanto envia a solicitação, os controles
de confirmação ficam bloqueados, sem permitir envios repetidos.

### QA-08 — URL não pode conceder acesso

1. Com o usuário principal logado, abra `http://<unrelatedHost>:3003/inbox`.
2. Volte a A `/inbox` por endereço explícito.

Esperado: em C, **“Workspace unavailable”**, sem conteúdo autorizado/composer
de C; não redireciona silenciosamente para B por causa da preferência. Em A,
o acesso permitido continua funcionando. Globex não aparece no menu do usuário.

### QA-09 — Trocar usuário não reutiliza dados do anterior

1. Em um workspace permitido, faça Sign out.
2. Entre pela URL de B usando `otherEmail` e `password`.
3. Abra o seletor e confira o nome do usuário na sidebar.

Esperado: usuário **Other User**, Northwind e Globex disponíveis, Acme ausente.
Não reutiliza a lista/cache ou preferência do usuário principal.

### QA-10 — Conta sem workspace

1. Faça Sign out e entre pela URL genérica com `emptyEmail` e `password`.

Esperado: **“No workspace available”**, mensagem explicativa e opção de Sign out.
Não oferece Compose ou seletor com workspaces de outra conta. Não carrega emails
globais nem entra em loop de redirecionamento.

### QA-11 — Teclado, mobile e temas

1. Saia e entre em A com o usuário principal.
2. Sem mouse: use Tab até o seletor, abra com Enter, navegue com as setas,
   feche com Escape; reabra e selecione B com Enter.
3. Em A, repita a confirmação de rascunho usando apenas teclado; cancele.
4. No DevTools, simule largura **390 px**. Abra a sidebar pelo botão de alternar
   e repita a seleção. Confira também desktop (por exemplo, 1440 px).
5. Repita as verificações visuais nos temas claro e escuro.

Esperado: foco visível, nomes/opções legíveis, menu/diálogo operáveis sem mouse,
sem armadilha de foco. No mobile, seletor acessível dentro da sidebar, ações sem
cortes e sem scroll horizontal da página. Confirmação tem contraste legível.
Isso é emulação responsiva; dispositivo real/leitor de tela precisam de registro
separado caso sejam usados. Axe automatizado não substitui essa inspeção.

## 3. Recuperação — controles exclusivos da fixture local

Estes cenários alteram somente os dados sintéticos desta execução. Rode os
comandos no **mesmo PowerShell**, com o Core de teste ativo. Nunca use esses
endpoints ou esse procedimento em development/staging/production reais.

Preparação dos controles:

```powershell
$qaFixture = Invoke-RestMethod 'http://127.0.0.1:8083/__fixture'
$qaControlHeaders = @{ 'x-fixture-control' = $qaFixture.controlKey }
```

Cada comando abaixo deve retornar `ready: true`. Se reiniciar o Core, releia a
fixture e os headers. A chave não deve ser incluída em screenshots/relatórios.

### QA-12 — Falha de troca não perde o rascunho

1. Em A, escreva uma mensagem e minimize, como em QA-06.
2. Antes de selecionar B, simule a próxima falha:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8083/__fixture/control' -Method Post -Headers $qaControlHeaders -ContentType 'application/json' -Body '{"action":"fail-next"}'
```

3. Selecione B e confirme **Descartar e trocar**.
4. Após o erro, escolha Continuar editando e restaure a mensagem.

Esperado: erro informa que a mensagem foi preservada; continua em A, com assunto,
corpo e anexos. Não apresenta B como ativo nem faz retry automaticamente.
Uma nova tentativa explícita pode funcionar, pois a falha foi injetada uma vez.

### QA-13 — Revogação de acesso prevalece sobre preferência

1. Sem rascunho, selecione B com sucesso. Mantenha uma segunda aba em A.
2. Revogue B para o usuário principal:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8083/__fixture/control' -Method Post -Headers $qaControlHeaders -ContentType 'application/json' -Body '{"action":"revoke-northwind"}'
```

3. Atualize B; atualize A. Depois visite `http://workspace.test:3003/inbox`.

Esperado: B fica indisponível, embora fosse a escolha salva; A continua permitido.
A entrada genérica usa A, pois B não é mais autorizado. Visitar B diretamente
continua negado, sem fallback silencioso. Não exige logout por mera revogação.

Após registrar o resultado, restaure apenas os dados da fixture:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8083/__fixture/control' -Method Post -Headers $qaControlHeaders -ContentType 'application/json' -Body '{"action":"reset"}'
```

Esse reset restaura a associação sintética a B e limpa preferências/orçamento
dos usuários de teste, não as sessões. Recarregue as abas antes do próximo caso.

### QA-14 — Sessão expirada não mantém acesso

1. Entre em A com o usuário principal, sem rascunho.
2. Expire suas sessões sintéticas:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8083/__fixture/control' -Method Post -Headers $qaControlHeaders -ContentType 'application/json' -Body '{"action":"expire-session"}'
```

3. Atualize a página.

Esperado: exige novo login; contexto/composer autorizados não continuam ativos.
Após login válido, volta a resolver o workspace com as permissões atuais.
Expiração/retorno de foco sem refresh tem cobertura automatizada complementar.

## 4. Validação técnica complementar

Não marque como aprovado um caso que não executou. Os cenários de corrida,
respostas atrasadas, RLS, orçamento e privacidade exigem testes técnicos, não
apenas observar o seletor. A suíte de Web usa Core/auth/PostgreSQL reais; falhas
injetadas e entrega de email capturada são doubles explicitamente locais.

Para rodar as suítes, primeiro feche o navegador de QA e encerre **apenas** os
dois servidores manuais com Ctrl+C. O harness inicia seus próprios servidores
e não reutiliza os anteriores. Não rode os comandos simultaneamente nem edite
arquivos enquanto o Vite estiver em teste.

Na pasta do Web, com a mesma toolchain e banco local:

```bash
MAILFLOW_CORE_WORKTREE=/home/p4van772000/mentoria/mailflow-core-onboarding \
MAILFLOW_WORKSPACE_TEST_DATABASE_URL=postgresql://workspace_test_admin:workspace_test_local_only@127.0.0.1:55433/mailflow_workspace_test \
bun run test:workspace-switching:e2e --reporter=line
```

Cobre também limitação real de requisições (429), espera anunciada sem perder
rascunho, retomada genérica, URLs sanitizadas, revogação ao recuperar foco,
respostas antigas de outra identidade e startup concorrente em A/B. Não
desabilite o rate limit para fazer o teste passar. O primeiro carregamento em
dev pode ser lento pela compilação; isso não comprova um SLO de produção.

Regressão do shell/composer/auth legado, com seus doubles próprios:

```bash
E2E_PORT=3005 bun run test:e2e --reporter=line
```

Onboarding integrado — na pasta do Site, depois dos comandos anteriores:

```bash
cd /home/p4van772000/mentoria/mailflow-site-onboarding
MAILFLOW_ONBOARDING_CORE_DIR=/home/p4van772000/mentoria/mailflow-core-onboarding \
MAILFLOW_ONBOARDING_WEB_DIR=/home/p4van772000/.codex/worktrees/workspace-foundation/mailflow-web \
MAILFLOW_WORKSPACE_TEST_DATABASE_URL=postgresql://workspace_test_admin:workspace_test_local_only@127.0.0.1:55433/mailflow_workspace_test \
bun run test:e2e:onboarding --reporter=line
```

Esse teste cobre signup com workspace/subdomínio → refresh/resend → OTP capturado
→ login explícito → contexto autorizado, desktop/mobile. **Não valida chegada de
email numa caixa real**. O Site não é necessário para QA-01 a QA-14, que usam
contas sintéticas já verificadas.

Registre também os checks de Core/Web/Site e, quando executada, a suíte separada
de correlação Faro/OTLP descrita nas evidências. O collector local não comprova
Grafana remoto. Falhas técnicas não devem ser classificadas como aprovadas por
terem passado numa execução anterior.

## 5. Registrar o aceite e encerrar

Copie este bloco para o relatório da execução. Não anexe cookies, senhas, OTPs,
chaves da fixture ou dados reais; screenshots e mensagens devem ser sanitizados.

```text
QA Workspace Management
Responsável / data:
Commits de Core / Web / Site:
Ambiente: local isolado
Navegador / versão / resolução / tema:

QA-01 Lista e workspace atual:
QA-02 Troca e navegação:
QA-03 Refresh:
QA-04 Nova sessão e prioridade do host:
QA-05 Abas independentes:
QA-06 Cancelamento e rascunho:
QA-07 Descarte confirmado:
QA-08 Host sem acesso:
QA-09 Troca de identidade:
QA-10 Conta sem workspace:
QA-11 Teclado, mobile, claro/escuro:
QA-12 Falha de troca:
QA-13 Revogação:
QA-14 Sessão expirada:

Checks Core/Web/Site — resultado e execução:
E2E workspace / legado / onboarding — resultado e execução:
Telemetria local — resultado ou Não executado:
Para cada falha: cenário, passos, esperado, observado e evidência sanitizada.
Conclusão: Aprovado localmente / Reprovado / Bloqueado.
Pendências de ambiente real: permanecem separadas deste aceite.
```

Aceite local: QA-01 a QA-14 executados e aprovados, checks/suítes obrigatórios
sem falhas não resolvidas e evidências anexadas. Um cenário bloqueado não é
aprovado. Não autorize deploy só pelo aceite local: a etapa real ainda exige
topologia aprovada, continuidade de sessão implementada/validada e seu checklist.

Ao terminar, feche a janela/perfil de QA e encerre Web/Core com Ctrl+C nos
terminais usados. O Core remove somente as contas/workspaces da própria fixture
ao encerrar normalmente. Não apague o banco/container nem seu perfil pessoal.
