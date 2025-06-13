# 🔧 Solução Rápida - Banco de Dados
## Configure em 2 minutos

### 📋 Passo 1: Criar Banco Gratuito (Neon)
1. Acesse: https://neon.tech
2. Clique "Sign up" e entre com GitHub/Google
3. Crie projeto "AmigoMontador"
4. Copie a "Connection string"

### ⚙️ Passo 2: Configurar no Projeto
1. Abra o arquivo `.env` na raiz do projeto
2. Descomente e configure:
```
DATABASE_URL=sua_string_de_conexao_aqui
```

### 🚀 Passo 3: Executar
```bash
npm run db:push
npm run dev
```

### 🔗 Exemplo de String de Conexão
```
DATABASE_URL=postgresql://neondb_owner:abc123@ep-cool-math-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### ⚡ Alternativa Rápida - ElephantSQL
1. Acesse: https://www.elephantsql.com
2. Criar conta gratuita
3. Criar instância "Tiny Turtle" (gratuita)
4. Copiar URL da instância

### 📞 Problemas?
- Verifique se o arquivo `.env` está na raiz
- Confirme se DATABASE_URL não tem espaços extras
- Teste a conexão no painel do provedor