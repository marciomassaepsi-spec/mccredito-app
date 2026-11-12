# Roteiro de testes

Faça depois de colocar o app no ar (README, "Como colocar no ar"). Leva uns 20 minutos. Use o
celular, que é onde o app vai ser usado. Marque cada item; se algo não sair como descrito, anote o
número do passo e o que apareceu na tela.

## 1. Entrada e segurança

- [ ] **1.1** Abra o endereço do app. Aparece a tela verde com o logo e "Bem-vindo de volta".
- [ ] **1.2** Entre com uma senha errada. Aparece "E-mail ou senha incorretos.".
- [ ] **1.3** Entre com a senha certa. Abre o **Painel**.
- [ ] **1.4** Toque no ícone de sair (canto superior direito). Volta para o login.
- [ ] **1.5** Numa janela anônima do navegador, abra `seu-endereco/clientes`. Você é mandado para o
      login, sem ver nenhum dado.

## 2. Configurações

- [ ] **2.1** Toque na engrenagem. Preencha cidade (`Salvador - BA`), nome completo e CPF do
      responsável, tipo **Celular** e a sua chave PIX (o celular com DDD, só os números). Deixe o
      **CNPJ da empresa** vazio por enquanto. Toque em **Salvar configurações**.
- [ ] **2.2** Aparece "Configurações salvas." e a chave aparece formatada, como `(71) 9xxxx-xxxx`.
- [ ] **2.3** Digite um CPF errado e salve. O campo fica vermelho com "CPF ou CNPJ inválido." e o
      resto do que você digitou continua lá. Corrija e salve de novo.
- [ ] **2.4** Digite `11.222.333/0001-80` no **CNPJ da empresa** e salve. O campo fica vermelho com
      "CNPJ inválido. Confira os 14 números." Apague o CNPJ e salve de novo (ele é opcional).

## 3. Calculadora

- [ ] **3.1** Abra **Calculadora**. A primeira tela mostra **6x de R$ 344,31** (R$ 1.500 a 9,99%).
- [ ] **3.2** Troque para valor `1.000`, taxa `10`, parcelas `6`. Mostra **6x de R$ 229,61**.
- [ ] **3.3** Toque em **SAC** e depois em **Juros simples**. Os valores digitados continuam.
- [ ] **3.4** Aba **Atraso**: `229,61`, `10` dias, multa `2`, mora `1`. Mostra **R$ 234,97**.
- [ ] **3.5** Aba **Descobrir taxa**: `1.500,00`, parcela `344,00`, `6`. Mostra **9,96% ao mês**.

## 4. Dados de exemplo (opcional, mas ajuda a ver tudo funcionando)

- [ ] **4.1** No Supabase, rode `supabase/seed.sql` no SQL Editor.
- [ ] **4.2** O **Painel** mostra carteira, atrasos, gráficos e "33 de 150" contratos.
- [ ] **4.3** A **Cobrança** mostra promessas, atrasadas, que vencem hoje e próximos 7 dias.

## 5. Cliente e empréstimo

- [ ] **5.1** **Clientes → Novo**. Cadastre um cliente de teste com **o seu próprio WhatsApp** (para
      receber a mensagem de teste no passo 7) e CPF `529.982.247-25`. Marque a autorização.
- [ ] **5.2** Na ficha, toque em **Empréstimo**. Valor `1.500,00`, taxa `9,99`, `6` parcelas.
      Toque em **Revisar empréstimo**: aparece o resumo com as 6 datas.
- [ ] **5.3** **Confirmar e salvar**. Abre o empréstimo com 6 parcelas "A vencer".
- [ ] **5.4** **Abrir PDF**: o contrato abre com os dados da empresa, os do cliente, o valor por
      extenso e a tabela de parcelas. O CREDOR é a MC Créditos, "inscrita no CNPJ sob o nº" seguido
      de uma linha em branco para escrever à mão, "neste ato representada por" você. A assinatura
      do CREDOR é da MC Créditos e também tem a linha no lugar do CNPJ. (Peça para um advogado
      revisar o texto antes de usar de verdade.)
- [ ] **5.4b** Em **Configurações**, preencha o **CNPJ da empresa** (o CNPJ de verdade) e salve: ele
      aparece formatado, como `00.000.000/0000-00`. Abra o PDF de novo: o CNPJ aparece no lugar da
      linha em branco, no texto e na assinatura.
- [ ] **5.5** **Guardar cópia**: o contrato aparece em **Documentos** e abre ao tocar.

## 6. Pagamentos

- [ ] **6.1** **Receber 1ª**. Tire uma foto qualquer como comprovante e registre. A parcela fica
      "Paga" e o pagamento aparece com o link **Comprovante**, que abre a foto.
- [ ] **6.2** No pagamento, toque em **Estornar**, escreva um motivo e confirme. A parcela volta a
      ficar em aberto e o pagamento aparece riscado.
- [ ] **6.3** Receba a 1ª de novo, mas com um valor menor (ex.: `100,00`). Aparece "Pagamento parcial
      registrado" e a parcela mostra quanto já foi pago.
- [ ] **6.4** **Quitar tudo**: mostra o desconto dos juros futuros. Confirme. O empréstimo fica
      "Quitado".

## 7. Cobrança

- [ ] **7.1** Crie outro empréstimo para o cliente de teste com o 1º vencimento **hoje**.
- [ ] **7.2** Em **Cobrança**, ele aparece em "Vencem hoje". Toque em **WhatsApp**: abre a conversa
      com o seu número e a mensagem pronta com nome, valor e chave PIX.
- [ ] **7.3** Toque em **Chave PIX**: aparece "Chave PIX copiada". Cole em algum lugar para conferir.
- [ ] **7.4** Toque em **Contato**, escolha "Prometeu pagar", uma data e salve. Na ficha do cliente,
      o contato aparece em "Contatos de cobrança".
- [ ] **7.5** Em Configurações, mude o horário de cobrança para um intervalo que já passou hoje.
      Na Cobrança, os botões de WhatsApp ficam "Fora do horário". Volte o horário para 08:00 às 20:00.
- [ ] **7.6** **Configurações → Mensagens de cobrança**: mude um texto e veja a prévia mudar.
- [ ] **7.7** Se houver atrasados com endereço, **Visitas do dia** abre a rota no Google Maps.

## 8. Renegociação

- [ ] **8.1** No empréstimo do passo 7, toque em **Renegociar**. O topo mostra **Quanto falta** (a
      soma do que falta das parcelas em aberto) e quantas parcelas faltam. Se houver parcela
      atrasada, aparece a multa e a mora e a caixa **Somar multa e mora** (desmarcada).
- [ ] **8.2** Em **Dinheiro novo para o cliente** digite `500,00`: o **Valor do novo contrato** passa a
      ser o que falta + R$ 500,00. Em **Parcelas novas**, digite um valor de parcela pequeno demais
      (ex.: `10,00`): aparece "A parcela não fecha…". Corrija para um valor que feche e veja a taxa.
- [ ] **8.3** **Revisar renegociação**: confira quanto faltava, o dinheiro novo, o valor do novo
      contrato, as parcelas e a taxa, e **O cliente recebe agora: R$ 500,00**. Confirme. Abre o
      empréstimo novo com "Renegociação de contrato de …: saldo anterior … + dinheiro novo R$ 500,00";
      o antigo fica "Renegociado", com as parcelas em aberto canceladas, e os dois têm link um para
      o outro.
- [ ] **8.4** No empréstimo novo, **Abrir PDF**: a cláusula 1 diz que o contrato substitui o anterior e
      que o valor é o saldo anterior somado aos R$ 500,00 entregues.
- [ ] **8.5** Em **Vendas**, abra o mês de hoje: a renegociação aparece com a etiqueta
      **Renegociação** e conta só os R$ 500,00 de dinheiro novo.

## 8b. Contratos de antes do app

- [ ] **8b.1** **Empréstimos → Novo**: valor `1.500,00`, toque em **Sei o valor da parcela** e digite
      `344,00`, `6` parcelas. Data da liberação e 1º vencimento uns 3 meses atrás. Marque **Este
      empréstimo começou antes do app** e coloque `2` parcelas já pagas.
- [ ] **8b.2** Na revisão, as parcelas são de **R$ 344,00**, a taxa aparece como **9,96%** e as duas
      primeiras estão marcadas **Paga**. Confirme: o empréstimo abre com 2 parcelas pagas.
- [ ] **8b.3** **Empréstimos → Importar contratos de antes do app → Baixar planilha modelo**. Preencha
      duas linhas (um cliente de teste novo e um com erro, ex.: valor `mil`) e envie.
- [ ] **8b.4** A conferência mostra uma linha **Pronto** e a outra **Com erro**, dizendo o que corrigir.
      Toque em **Importar 1 contrato**: aparece "1 contrato importado".
- [ ] **8b.5** Envie a mesma planilha de novo e importe: aparece "já estavam no app e não foram
      duplicados".

## 9. Painel, backup e histórico

- [ ] **9.0** No **Painel**, toque em **Vendido em (mês)**. A tela **Vendas** mostra o total emprestado no
      período, o gráfico mês a mês (verde = emprestado, dourado = juros) e a lista dos meses. Toque num
      mês: aparecem os contratos daquele mês, com valor, parcelas e juros de cada um.

- [ ] **9.1** **Configurações → Exportar e backup → Baixar backup**. Abra o arquivo no Excel ou no
      Google Planilhas: tem abas Sobre, Clientes, Empréstimos, Parcelas, Pagamentos e Contatos, com
      datas e valores em reais.
- [ ] **9.2** Baixe a planilha **Pagamentos (CSV)** e abra no Excel: os centavos aparecem com vírgula.
- [ ] **9.3** **Configurações → Histórico de alterações** mostra o que você fez hoje, com hora.

## 10. LGPD

- [ ] **10.1** Cadastre um cliente sem empréstimo. Na ficha, em **Dados pessoais (LGPD)**, toque em
      **Baixar os dados deste cliente**: baixa um arquivo `.json`.
- [ ] **10.2** Toque em **Excluir dados pessoais**, digite `EXCLUIR` e confirme. Volta para a lista
      com "Cadastro e arquivos do cliente excluídos." e ele não aparece mais.

## 11. Celular

- [ ] **11.1** Instale o app na tela inicial (README, passo 6). Ele abre com o ícone do logo, sem a
      barra do navegador.
- [ ] **11.2** Nenhuma tela fica cortada nos lados nem precisa rolar para o lado.

## 12. Limpeza

- [ ] **12.1** Se carregou os dados de exemplo, rode `supabase/limpar-exemplos.sql` no SQL Editor.
- [ ] **12.2** Exclua os clientes de teste pela ficha (**Excluir dados pessoais**). Se algum tiver
      empréstimo ativo, cancele o empréstimo antes (no fim da tela do empréstimo). Quem teve
      empréstimo fica na lista como "Titular anonimizado", sem nenhum dado pessoal: é o que a lei
      pede para guardar os valores.
