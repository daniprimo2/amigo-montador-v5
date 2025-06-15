# Estrutura do Projeto AmigoMontador

## Diretórios Principais

```
amigomontador/
├── client/              # Frontend React + TypeScript
│   ├── public/          # Assets estáticos
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilitários frontend
│   │   └── types/       # Tipos TypeScript
│   └── index.html
│
├── server/              # Backend Node.js + Express
│   ├── auth.ts          # Sistema de autenticação
│   ├── db.ts            # Conexão com banco
│   ├── routes.ts        # Rotas da API
│   ├── storage.ts       # Operações de banco
│   ├── geocoding.ts     # Serviços de geolocalização
│   ├── email-service.ts # Serviço de email
│   └── index.ts         # Entrada do servidor
│
├── shared/              # Código compartilhado
│   └── schema.ts        # Schemas do banco de dados
│
├── scripts/             # Scripts de build e deploy
│   ├── create-final-playstore-aab.js
│   ├── validate-final-aab.js
│   ├── build-production.js
│   └── verify-aab.sh
│
├── docs/                # Documentação
│   ├── CHECKLIST_PLAY_STORE.md
│   ├── FINAL_VERIFICATION_REPORT.md
│   └── PROJECT_STRUCTURE.md
│
├── android-release/     # Arquivos prontos para Android
│   ├── amigomontador-release.aab
│   └── amigomontador-keystore.jks
│
├── uploads/             # Arquivos enviados pelos usuários
│   ├── documents/
│   ├── logos/
│   ├── profiles/
│   └── projects/
│
├── migrations/          # Migrações do banco
└── public/              # Assets públicos estáticos
```

## Arquivos de Configuração

- `package.json` - Dependências e scripts npm
- `vite.config.ts` - Configuração do Vite
- `tailwind.config.ts` - Configuração do Tailwind CSS
- `drizzle.config.ts` - Configuração do Drizzle ORM
- `capacitor.config.ts` - Configuração do Capacitor
- `tsconfig.json` - Configuração do TypeScript
- `.env` - Variáveis de ambiente
- `.gitignore` - Arquivos ignorados pelo Git

## Fluxo de Dados

1. **Frontend (React)** → API calls → **Backend (Express)**
2. **Backend** → Database queries → **PostgreSQL**
3. **Real-time** → WebSocket → **Cliente/Servidor**
4. **Mobile** → Capacitor → **Android App**

## Scripts Principais

- `npm run dev` - Desenvolvimento
- `npm run build` - Build produção
- `npm run db:push` - Atualizar schema
- `node scripts/create-final-playstore-aab.js` - Gerar AAB

## Tecnologias por Camada

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS + Radix UI
- TanStack Query (estado)
- Wouter (roteamento)

### Backend
- Node.js + Express
- Passport.js (auth)
- Drizzle ORM
- WebSocket (ws)
- Express-fileupload

### Mobile
- Capacitor
- Android Studio (build)
- AAB (Android App Bundle)

### Banco de Dados
- PostgreSQL
- Neon.tech (cloud)
- Session storage