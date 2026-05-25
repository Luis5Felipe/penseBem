# Contexto das alteracoes

Este documento resume as principais correcoes feitas no projeto PenseBem para compatibilidade, importacao no Expo Snack e melhoria da interface responsiva.

## Branch Snack

Branch usada: `deploy`

Objetivo: deixar o projeto importavel no Expo Snack e compatível com Expo SDK 55.

Principais ajustes:

- Corrigido `main` do `package.json` para `expo-router/entry`.
- Alinhadas dependencias para Expo SDK 55.
- Removidas bibliotecas que causavam conflito no Snack.
- Simplificado `app.json` para evitar falha no upload de assets.
- Removidos assets PNG nao utilizados que quebravam a importacao do Snack.
- Removido `package-lock.json` da branch do Snack para evitar resolucao indevida de dependencias.
- Removidas `devDependencies` que o Snack tentava baixar sem necessidade.
- Mantido `expo-router` como estrutura de rotas.

Bibliotecas removidas da branch Snack:

- `@expo/ui`
- `expo-glass-effect`
- `expo-symbols`
- `react-native-worklets`
- `react-native-reanimated`
- `react-native-screens`
- `react-native-gesture-handler`
- `react-native-safe-area-context`
- `eslint`
- `eslint-config-expo`
- `typescript`
- `babel-preset-expo`

Commits principais:

- `166beb5` - `Fix Expo SDK 55 compatibility`
- `9c374ad` - `Make Expo config Snack friendly`
- `eb27199` - `Remove unused assets for Snack import`
- `a04be84` - `Simplify dependencies for Snack`
- `b1df3ea` - `Improve mobile game UI`

URL para importar no Snack:

```text
https://github.com/Luis5Felipe/penseBem/tree/deploy
```

## Branch Vercel

Branch usada: `fix/resolvendo-bug-na-responsividade`

Objetivo: aplicar as melhorias de jogo e responsividade na branch usada para deploy web/Vercel, sem trazer as simplificacoes especificas do Snack.

Principais ajustes:

- Mantida a configuracao original da branch Vercel.
- Aplicadas melhorias de UI do jogo.
- Corrigida responsividade no modo telefone.
- Convertida a lista de partes especificas em dropdown.
- Mantidas dependencias e assets proprios da branch web.

Commit principal:

- `64967b0` - `Improve Vercel mobile game UI`

## Funcionalidades verificadas

As funcionalidades abaixo ja existem ou foram ajustadas no fluxo atual:

- Validacao de respostas.
- Contagem de tentativas.
- Calculo de pontos.
- Armazenamento de progresso no web via `localStorage`.
- Botao para reiniciar jogo.
- Tela inicial/menu.
- Tela de pergunta com opcoes de resposta.
- Tela de feedback para acerto, erro e tempo esgotado.
- Tela de resultado final com pontuacao total.
- Design responsivo para mobile.

## Melhorias de interface

No menu:

- Os blocos do programa continuam disponiveis para selecao.
- A secao `Partes especificas` agora usa dropdown.
- Em telas estreitas, os botoes passam para uma coluna.
- Os botoes de dificuldade tambem empilham no telefone.

Na tela de jogo:

- Cabecalho da pergunta aceita quebra de linha em telas pequenas.
- Linha de codigo, pontos e tempo pode quebrar sem sobrepor conteudo.
- Botoes de acao empilham no mobile.
- Opcoes de resposta foram ajustadas para evitar layout espremido.

Na tela final:

- Resultado final agora aparece como uma tela dedicada.
- Exibe pontuacao total no formato `score/maxScore`.
- Permite reiniciar ou voltar ao menu.

## Validacoes executadas

Na branch Snack:

```bash
npx tsc --noEmit
npx expo export --platform web
```

Na branch Vercel:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Todas as validacoes passaram no momento das alteracoes.

## Observacoes importantes

- A branch `deploy` foi otimizada para Expo Snack, por isso ela foi simplificada agressivamente.
- A branch `fix/resolvendo-bug-na-responsividade` foi mantida mais completa para uso no Vercel.
- O erro inicial do Snack estava relacionado a importacao/upload de assets e resolucao de dependencias.
- O problema visual no telefone vinha principalmente do grid fixo de duas colunas no menu.
- A solucao mobile adotada foi trocar para coluna unica em telas estreitas e usar dropdown para reduzir a altura do menu.
