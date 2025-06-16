# Guia de Instalação Completa - AmigoMontador

## Download e Configuração Inicial

### 1. Após Download do Projeto

```bash
# Instalar dependências
npm install

# Verificar se tudo está funcionando
node scripts/verify-setup.js
```

### 2. Configuração do Banco de Dados

O projeto usa PostgreSQL. Configure suas credenciais no arquivo `.env`:

```env
DATABASE_URL=postgresql://seu_usuario:sua_senha@localhost:5432/amigomontador
PGHOST=localhost
PGPORT=5432
PGUSER=seu_usuario
PGPASSWORD=sua_senha
PGDATABASE=amigomontador
```

### 3. Sincronizar Banco de Dados

```bash
# Criar tabelas no banco
npm run db:push
```

### 4. Configurar Email (Recuperação de Senha)

No arquivo `.env`, configure um provedor SMTP:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app-gmail
```

### 5. Iniciar Aplicação

```bash
# Modo desenvolvimento
npm run dev

# Acessar: http://localhost:5000
```

## Funcionalidades Disponíveis

### ✅ Sistema de Usuários
- Cadastro de lojistas e montadores
- Login e autenticação segura
- Recuperação de senha por email
- Perfis com fotos e documentos

### ✅ Gestão de Serviços
- Criação de serviços por lojistas
- Candidaturas de montadores
- Chat em tempo real
- Sistema de avaliações

### ✅ Geolocalização
- Cálculo de distâncias por CEP
- Matching por proximidade
- Mapa de serviços disponíveis

### ✅ Pagamentos
- Integração PIX
- Gestão de contas bancárias
- Comprovantes de pagamento

### ✅ Mobile App (Android)
- Arquivo AAB pronto: `android-release/amigomontador-release.aab`
- Compatível com Android 5.1+ (API 22-34)
- Pronto para upload na Play Store Console

## Estrutura de Pastas

```
amigomontador/
├── android-release/          # AAB e keystore para Play Store
├── client/                   # Frontend React
├── server/                   # Backend Express
├── shared/                   # Esquemas compartilhados
├── uploads/                  # Arquivos enviados pelos usuários
├── docs/                     # Documentação
├── scripts/                  # Scripts de build e verificação
└── .env                      # Configurações (configurar!)
```

## Verificação de Funcionamento

Execute o script de verificação:

```bash
node scripts/verify-setup.js
```

Se tudo estiver ✅, o sistema está pronto para uso.

## Upload para Play Store

1. Acesse: https://play.google.com/console
2. Crie um novo app ou selecione existente
3. Vá para "Versões" → "Versões de produção"
4. Faça upload do arquivo: `android-release/amigomontador-release.aab`
5. Configure metadados e publique

## Suporte Técnico

Todas as funcionalidades foram testadas e validadas. O sistema está completo e pronto para produção.