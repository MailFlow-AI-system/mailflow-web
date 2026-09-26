# Design System 0.2.0 e integração com o Application Shell

## Objetivo

Adicionar ao `@mailflow/ui` os componentes reutilizáveis necessários para o Application Shell e, somente depois da publicação oficial da release, migrar o `mailflow-web` para a tag `v0.2.0`.

O `mailflow-web` continuará responsável pela composição específica do produto: navegação, workspace, busca, usuário, configurações, tema, breadcrumbs e regras de negócio.

## Estado inicial confirmado

- O Design System possui a release oficial `v0.1.0`.
- A `v0.1.0` aponta para o commit aceito na `main`.
- O `mailflow-web` ainda consome um commit SHA do Design System.
- A próxima release combinada será `0.2.0`, pois adicionará capacidades públicas novas.

## Fase 1 — Preparar o Design System

### Branch

Criar a branch a partir da `origin/main` atualizada:

```bash
git fetch origin --prune
git switch main
git pull --ff-only origin main
git switch -c feat/ds-app-shell-components
```

### Componentes

Adicionar ao Design System:

- `Select`, idêntico ao componente atual do `mailflow-web`;
- `Sidebar primitives`, incluindo comportamento desktop/mobile, colapso, trigger, grupos, menu e footer;
- `SheetContent variant="sidebar"`, preservando o `Sheet` padrão;
- tipos públicos e internos em arquivos próprios;
- exports públicos em `@mailflow/ui/components`;
- stories e testes de comportamento/acessibilidade.

A variante `sidebar` do `Sheet` deverá concentrar os estilos e comportamentos específicos do sidebar mobile, sem alterar o comportamento padrão do `Sheet`.

### Release metadata

Atualizar:

- `package.json` para `0.2.0`;
- `changelogs/0.2.0/CHANGELOG.md`;
- template/documentação do PR conforme o contrato do repositório.

O changelog deve registrar componentes adicionados, variante do `Sheet`, impacto SemVer, contrato público, acessibilidade, migração, validações e compatibilidade com consumidores.

## Fase 2 — Validação do Design System

Executar no Design System:

```bash
bun run check
```

Também conferir manualmente:

- exports públicos funcionando por `@mailflow/ui/components`;
- stories de `Select`, `Sidebar` e `Sheet` padrão/sidebar;
- teclado, abertura, fechamento, seleção e colapso;
- comportamento desktop e mobile;
- ausência de alteração visual não intencional no `Sheet` padrão.

## Fase 3 — Ação manual obrigatória: PR e publicação da release

Esta fase não deve ser pulada nem feita automaticamente junto com a implementação do web.

### O que o usuário precisa fazer manualmente

1. Revisar e abrir o PR do Design System para `main`.
2. Confirmar que o PR contém a versão `0.2.0` e o changelog correspondente.
3. Aguardar os checks obrigatórios do CI.
4. Aprovar e fazer o merge do PR na `main`.
5. Depois do merge, obter o SHA exato que está em `origin/main`:

   ```bash
   git fetch origin
   git rev-parse origin/main
   ```

6. Criar a tag e a GitHub Release no commit mergeado. Substituir `<SHA_DO_MERGE>` pelo resultado anterior:

   ```bash
   gh release create v0.2.0 \
     --target <SHA_DO_MERGE> \
     --title v0.2.0 \
     --notes-file /tmp/mailflow-v0.2.0-release-notes.md
   ```

   O arquivo de notas deve mencionar os itens do `changelogs/0.2.0/CHANGELOG.md`. Ele pode ser criado manualmente copiando o conteúdo do changelog.

7. Confirmar no GitHub que:

   - a tag `v0.2.0` existe;
   - a tag aponta para o mesmo SHA de `origin/main` após o merge;
   - a GitHub Release `v0.2.0` está publicada;
   - o changelog está vinculado às notas da release.

Somente após esses quatro pontos a versão estará liberada para consumo pelo `mailflow-web`.

### O que não fazer

- Não atualizar o web para `main`, branch de feature ou SHA provisório do DS.
- Não criar a tag antes do merge aprovado.
- Não iniciar a migração do web apenas porque o PR foi aberto.
- Não considerar o merge sozinho como uma release.

## Fase 4 — Integrar a release no `mailflow-web`

Depois da confirmação manual da release publicada:

1. Atualizar `@mailflow/ui` de SHA para a tag `v0.2.0`.
2. Atualizar `bun.lock` com a nova referência.
3. Importar `Select`, `Sheet` e `Sidebar primitives` de `@mailflow/ui/components`.
4. Remover as cópias locais equivalentes somente depois de confirmar que os imports públicos funcionam.
5. Usar `SheetContent variant="sidebar"` no menu mobile.
6. Manter no `app-shell` somente a composição específica do MailFlow.
7. Preservar navegação, workspace, busca, usuário, settings, tema e breadcrumbs.
8. Corrigir o CTA da landing page para manter semântica de link e atualizar o teste para procurar um link.

## Fase 5 — Validação do `mailflow-web`

Executar:

```bash
bun run check
```

Validar também:

- build de produção;
- imports somente por exports públicos;
- sidebar expandido e recolhido;
- menu mobile aberto e fechado;
- breadcrumbs;
- scroll independente do conteúdo;
- sidebar fixo;
- responsividade;
- ausência de layout shift;
- paridade visual com o shell atual;
- CTA renderizado como `<a>`/link, não como botão semântico.

## Critério final de conclusão

O trabalho só estará concluído quando:

- o PR do Design System estiver mergeado;
- `v0.2.0` estiver criada no commit correto;
- a GitHub Release estiver publicada;
- o `mailflow-web` estiver consumindo exatamente `v0.2.0`;
- lockfile, testes, build e validações do shell estiverem passando.
