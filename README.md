# AmigoMontador Platform

Plataforma mobile-first conectando profissionais de lojas de móveis com montadores especializados no Brasil.

## Funcionalidades

- Sistema dual: Lojistas e Montadores
- Mensagens em tempo real e notificações
- Gerenciamento e acompanhamento de serviços
- Correspondência baseada em localização
- Integração de pagamento com PIX
- Interface otimizada para mobile
- App Android pronto para Play Store

## Tecnologias

- **Frontend**: React + TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js + Express, PostgreSQL
- **Mobile**: Capacitor para Android
- **Banco**: Drizzle ORM com PostgreSQL
- **Autenticação**: Passport.js com sessões

## Desenvolvimento

1. Instalar dependências:
```bash
npm install
```

2. Configurar variáveis de ambiente:
```bash
cp .env.example .env
# Editar .env com suas configurações
```

3. Configurar banco de dados:
```bash
npm run db:push
```

4. Iniciar servidor de desenvolvimento:
```bash
npm run dev
```

## Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run check` - Verificações TypeScript
- `npm run db:push` - Aplicar mudanças no schema

## Estrutura do Projeto

```
├── client/          # Frontend React
├── server/          # Backend Express
├── shared/          # Tipos e schemas compartilhados
├── scripts/         # Scripts de build e deploy
├── docs/            # Documentação
├── android-release/ # Arquivos Android para produção
└── uploads/         # Diretório de uploads
```

## Deploy para Produção

### Aplicação Web
```bash
npm run build
```

### App Android
Os arquivos para Android estão prontos em `android-release/`:
- `amigomontador-release.aab` - Arquivo para Play Store
- `amigomontador-keystore.jks` - Keystore de assinatura

## Licença

Software proprietário - AmigoMontador Platform