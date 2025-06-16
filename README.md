# AmigoMontador Platform

Plataforma mobile-first conectando profissionais de lojas de móveis com montadores especializados no Brasil.

## 📱 Play Store - Configuração Simplificada

### Gerar App Android (2 minutos)
1. **Instalar Java**: `sudo apt install openjdk-11-jdk`
2. **Configurar**: Editar `configurar-playstore.js` (linha 4) com sua URL do Replit
3. **Gerar**: `node configurar-playstore.js`
4. **Publicar**: Upload do arquivo AAB gerado na [Play Console](https://play.google.com/console)

Ver [GUIA_PLAYSTORE.md](./GUIA_PLAYSTORE.md) para instruções detalhadas.

## Funcionalidades

- Sistema dual: Lojistas e Montadores
- Mensagens em tempo real e notificações
- Gerenciamento e acompanhamento de serviços
- Correspondência baseada em localização
- Integração de pagamento com PIX
- Interface otimizada para mobile
- App Android com WebView otimizado

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
├── configurar-playstore.js # Script principal para Play Store
├── GUIA_PLAYSTORE.md       # Guia completo de publicação
├── client/                 # Frontend React
├── server/                 # Backend Express
├── shared/                 # Tipos e schemas compartilhados
├── android-playstore/      # Estrutura Android (automatizada)
└── uploads/                # Diretório de uploads
```

## Deploy para Produção

### Aplicação Web
```bash
npm run build
```

### App Android (Simplificado)
1. Configure sua URL no arquivo `configurar-playstore.js`
2. Execute: `node configurar-playstore.js`
3. Upload do arquivo AAB gerado na Play Console

## Licença

Software proprietário - AmigoMontador Platform