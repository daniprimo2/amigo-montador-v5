# 🔧 Configuração do Banco de Dados Local
## Para Windows - Visual Studio Code

### ❌ Problema Atual
O aplicativo não consegue se conectar ao banco de dados porque as variáveis de ambiente não estão configuradas.

### ✅ Solução Recomendada - Neon PostgreSQL (Gratuito)

#### 1. Criar Conta no Neon
1. Acesse: https://neon.tech
2. Clique em "Sign Up" (usar conta Google/GitHub)
3. Crie um novo projeto chamado "AmigoMontador"

#### 2. Obter String de Conexão
1. No dashboard do Neon, vá em "Database"
2. Copie a "Connection string" 
3. Ela será algo como:
   ```
   postgresql://usuario:senha@host-123.neon.tech/neondb?sslmode=require
   ```

#### 3. Configurar no Arquivo .env
1. Abra o arquivo `.env` na raiz do projeto
2. Substitua a linha DATABASE_URL pela sua string:
   ```
   DATABASE_URL=postgresql://sua_string_aqui
   ```

#### 4. Executar Migração
No terminal do VS Code:
```bash
npm run db:push
```

#### 5. Iniciar Aplicação
```bash
npm run dev
```

### 🔄 Alternativa - PostgreSQL Local

Se preferir instalar PostgreSQL localmente:

1. **Baixar PostgreSQL**
   - Windows: https://www.postgresql.org/download/windows/
   - Instalar com usuário `postgres` e senha `senha`

2. **Criar Banco**
   ```sql
   CREATE DATABASE amigomontador;
   ```

3. **Configurar .env**
   ```
   DATABASE_URL=postgresql://postgres:senha@localhost:5432/amigomontador
   ```

### 🚀 Próximos Passos

Após configurar o banco:
1. Execute `npm run db:push` para criar as tabelas
2. Execute `npm run dev` para iniciar a aplicação
3. Acesse http://localhost:3000

### 📞 Suporte

Se tiver problemas:
- Verifique se o arquivo `.env` está na raiz do projeto
- Confirme se a string de conexão está correta
- Teste a conexão no terminal do Neon