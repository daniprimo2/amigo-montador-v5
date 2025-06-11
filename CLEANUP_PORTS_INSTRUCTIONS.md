
## Instruções Específicas para Limpeza de Portas

### Passo 1: Acesse o Painel de Portas
1. No Replit, clique no ícone de "Tools" na barra lateral
2. Selecione "Ports" na lista de ferramentas

### Passo 2: Remover Portas Específicas
Remova os seguintes mapeamentos clicando no "X" ao lado de cada porta:

- Porta 3000 (não utilizada)
- Porta 3001 (não utilizada)
- Porta 3002 (não utilizada)
- Porta 5001 (não utilizada)
- Porta 6000 (não utilizada)
- Porta 6001 (não utilizada)
- Porta 7000 (não utilizada)
- Porta 8000 (não utilizada)
- Porta 8080 (não utilizada)
- Porta 9000 (não utilizada)
- Porta 9999 (não utilizada)

**IMPORTANTE: NÃO remova a porta 5000 - ela está sendo usada pela aplicação**

### Passo 3: Configurar Porta Principal (5000)
Para a porta 5000 que deve permanecer:
1. Clique em "Set external port" 
2. Configure como: 80
3. Adicione nome: "amigo-montador-app"

### Configuração Final Esperada:
```
Internal Port: 5000
External Port: 80  
Name: amigo-montador-app
PID: [número do processo]
```

### Verificação Pós-Limpeza:
Após aplicar as mudanças, verifique se:
- Apenas 1 porta está listada (5000)
- A aplicação continua acessível
- Não há erros no console
