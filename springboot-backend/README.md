# Amigo Montador - Backend Spring Boot

## Visão Geral

Backend robusto da plataforma Amigo Montador desenvolvido com Spring Boot 3.2.4 e Java 21, seguindo as melhores práticas de arquitetura empresarial.

## Características Técnicas

### Stack Tecnológico
- **Framework**: Spring Boot 3.2.4
- **Java**: 21 (LTS)
- **Banco de Dados**: PostgreSQL
- **ORM**: JPA + Hibernate
- **Autenticação**: JWT (JSON Web Tokens)
- **Documentação**: Swagger/OpenAPI 3.0
- **Build**: Maven
- **Arquitetura**: MVC com Service Layer

### Funcionalidades Implementadas
- ✅ Sistema de autenticação JWT
- ✅ Gestão de usuários (Lojistas e Montadores)
- ✅ CRUD completo de serviços
- ✅ Sistema de candidaturas
- ✅ Chat em tempo real (WebSocket)
- ✅ Sistema de avaliações
- ✅ Upload de arquivos
- ✅ Geolocalização
- ✅ Documentação automática da API

## Estrutura do Projeto

```
springboot-backend/
├── src/main/java/com/amigomontador/api/
│   ├── entity/          # Entidades JPA
│   ├── repository/      # Repositórios Spring Data
│   ├── service/         # Camada de serviços
│   ├── controller/      # Controladores REST
│   ├── dto/            # Data Transfer Objects
│   ├── security/       # Configurações de segurança
│   ├── config/         # Configurações gerais
│   └── exception/      # Tratamento de exceções
├── src/main/resources/
│   └── application.yml # Configurações da aplicação
└── pom.xml            # Dependências Maven
```

## Entidades Principais

### User
- Usuário base (lojista ou montador)
- Autenticação JWT
- Perfil personalizado por tipo

### Store
- Dados da loja
- Vinculado ao usuário lojista
- Tipos de materiais aceitos

### Assembler
- Dados do montador
- Especialidades e certificações
- Raio de trabalho e disponibilidade

### Service
- Serviços publicados por lojas
- Geolocalização precisa
- Status de andamento

### Application
- Candidaturas dos montadores
- Sistema de aceitação/rejeição

### Message
- Chat entre loja e montador
- Suporte a diferentes tipos de mensagem

### Rating
- Sistema de avaliação bilateral
- Métricas detalhadas de performance

## Configuração e Instalação

### Pré-requisitos
- Java 21 ou superior
- Maven 3.8+
- PostgreSQL 12+
- IDE com suporte ao Spring Boot

### Variáveis de Ambiente
```bash
DATABASE_URL=jdbc:postgresql://localhost:5432/amigomontador
DB_USERNAME=postgres
DB_PASSWORD=sua_senha
JWT_SECRET=sua_chave_secreta_jwt
UPLOAD_DIR=./uploads
```

### Instalação

1. **Clone e navegue para o diretório**
```bash
cd springboot-backend
```

2. **Configure o banco de dados**
```sql
CREATE DATABASE amigomontador;
```

3. **Configure as variáveis de ambiente**
```bash
export DATABASE_URL="jdbc:postgresql://localhost:5432/amigomontador"
export DB_USERNAME="postgres"
export DB_PASSWORD="sua_senha"
export JWT_SECRET="sua_chave_jwt_super_segura"
```

4. **Execute a aplicação**
```bash
mvn spring-boot:run
```

5. **Acesse a documentação**
- API Docs: http://localhost:8080/api/api-docs
- Swagger UI: http://localhost:8080/api/swagger-ui.html

## Endpoints Principais

### Autenticação
```
POST /api/auth/login          # Login do usuário
POST /api/auth/register       # Registro de usuário
GET  /api/auth/validate       # Validar token JWT
```

### Usuários
```
GET    /api/users/{id}        # Buscar usuário
PUT    /api/users/{id}        # Atualizar usuário
DELETE /api/users/{id}        # Deletar usuário
```

### Serviços
```
GET    /api/services              # Listar serviços
POST   /api/services              # Criar serviço
GET    /api/services/{id}         # Buscar serviço
PUT    /api/services/{id}         # Atualizar serviço
DELETE /api/services/{id}         # Deletar serviço
GET    /api/services/available    # Serviços disponíveis
```

### Candidaturas
```
POST   /api/applications          # Criar candidatura
GET    /api/applications/service/{serviceId} # Candidaturas do serviço
PUT    /api/applications/{id}/accept         # Aceitar candidatura
PUT    /api/applications/{id}/reject         # Rejeitar candidatura
```

## Migração do Node.js

### Mapeamento de Entidades
O esquema do banco permanece idêntico, mas agora com anotações JPA:

```javascript
// Antes (Node.js + Drizzle)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  // ...
});
```

```java
// Depois (Spring Boot + JPA)
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
    // ...
}
```

### Benefícios da Migração

1. **Performance Superior**
   - Pool de conexões otimizado
   - Lazy loading automático
   - Cache de segundo nível

2. **Escalabilidade**
   - Melhor gestão de memória
   - Suporte nativo a clustering
   - Métricas detalhadas

3. **Segurança Robusta**
   - JWT com renovação automática
   - Validação de entrada integrada
   - Proteção contra SQL Injection

4. **Manutenibilidade**
   - Código mais organizado (MVC)
   - Testes automatizados
   - Documentação automática

5. **Ecossistema Empresarial**
   - Logging avançado
   - Monitoramento integrado
   - Deploy simplificado

## Próximos Passos

### Para React Native

1. **Configurar cliente HTTP**
```javascript
const API_BASE_URL = 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

2. **Implementar autenticação**
```javascript
const login = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  const { token, user } = response.data;
  
  // Salvar token no AsyncStorage
  await AsyncStorage.setItem('token', token);
  
  return { token, user };
};
```

3. **Configurar interceptors**
```javascript
apiClient.interceptors.request.use((config) => {
  const token = AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Desenvolvimento

### Comandos Úteis
```bash
mvn clean compile          # Compilar
mvn test                   # Executar testes
mvn spring-boot:run        # Executar aplicação
mvn package               # Gerar JAR
```

### Logs
A aplicação gera logs detalhados em `logs/application.log` com rotação automática.

### Monitoramento
Acesse http://localhost:8080/api/actuator para métricas da aplicação.

---

**Documentação técnica completa disponível em**: http://localhost:8080/api/swagger-ui.html