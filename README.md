# Furniture Installer Platform

A mobile-first platform connecting furniture store professionals with skilled installers in Brazil, featuring PIX payment integration and comprehensive service management.

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16.x
- npm or yarn package manager

## Local Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd furniture-installer-platform

# Install dependencies
npm install
```

### 2. Database Setup

Create a PostgreSQL database and set up the connection:

```bash
# Create database (adjust credentials as needed)
createdb furniture_installer_db

# Set environment variable
export DATABASE_URL="postgresql://username:password@localhost:5432/furniture_installer_db"
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/furniture_installer_db

# Session Secret
SESSION_SECRET=your-session-secret-key-here

# Stripe (if using payment features)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Development
NODE_ENV=development
```

### 4. Database Migration

Push the database schema:

```bash
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/               # React frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Page components
│       └── lib/          # Frontend utilities
├── server/               # Express backend
│   ├── auth.ts          # Authentication logic
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database operations
│   └── index.ts         # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts        # Database schema definitions
└── uploads/             # File uploads directory
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type checking
- `npm run db:push` - Push database schema changes

## Key Features

- **Multi-user Authentication**: Store owners and installers
- **Service Management**: Create, browse, and apply for installation jobs
- **Real-time Messaging**: WebSocket-based chat system
- **File Upload**: Project files and document management
- **Payment Integration**: PIX payment processing
- **Location Services**: Geolocation and distance calculation
- **Rating System**: User feedback and ratings

## User Types

1. **Store Owners (Lojistas)**: Create installation jobs, manage services
2. **Installers (Montadores)**: Browse and apply for jobs, communicate with stores

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **File Upload**: Express-fileupload
- **Real-time**: WebSockets
- **Payment**: Stripe integration