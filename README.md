# 👑 Sleeping Queens - Online Multiplayer Card Game

A magical, fully-featured online implementation of the beloved Sleeping Queens card game, built with Next.js, TypeScript, Supabase, and beautiful animations.

![Sleeping Queens Game](https://img.shields.io/badge/status-production%20ready-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-green)

## ✨ Features

### 🎮 Complete Game Implementation
- **Full Sleeping Queens rules**: All card types, actions, and win conditions
- **2-5 player support**: Scales perfectly from intimate games to larger groups
- **Real-time multiplayer**: Instant game updates with Supabase Realtime
- **Smart game engine**: Pure TypeScript game logic with comprehensive validation

### 🎨 Beautiful User Interface
- **Stunning card designs**: Custom-styled cards with animations and effects
- **Responsive design**: Perfect on desktop, tablet, and mobile devices
- **Smooth animations**: Framer Motion powered transitions and interactions
- **Intuitive drag & drop**: React Beautiful DnD for natural card interactions

### 🌐 Modern Architecture
- **Next.js 14**: Latest React framework with optimal performance
- **Supabase backend**: PostgreSQL database with real-time subscriptions
- **TypeScript throughout**: Type-safe development with comprehensive types
- **Tailwind CSS**: Utility-first styling with custom game themes

### 🔐 User Experience
- **Simple authentication**: Username-based sessions, no complex registration
- **Room codes**: Easy game joining with 6-character codes
- **Game persistence**: Resume games after browser refresh
- **Error handling**: Graceful error recovery and user feedback

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/sleeping-queens.git
   cd sleeping-queens
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Install Supabase CLI (if not already installed):
     ```bash
     npm install -g supabase
     ```
   - Link to your Supabase project:
     ```bash
     supabase link --project-ref your-project-ref
     ```
   - Run database migrations:
     ```bash
     npx supabase db push
     ```
   - Note: Migrations are located in `supabase/migrations/` and include:
     - `001_create_tables.sql` - Creates base tables
     - `add_move_id_column.sql` - Adds idempotency support
   - Optional: Run the seed data from `supabase/seed.sql`

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3001`

## 🎯 How to Play

### Objective
Be the first player to:
- **2 players**: Collect 5 queens OR reach 50 points
- **3-5 players**: Collect 4 queens OR reach 40 points

### Card Types & Actions

| Card Type | Action | Description |
|-----------|---------|-------------|
| 👑 **Kings** | Wake sleeping queens | Use to claim a sleeping queen |
| ⚔️ **Knights** | Steal queens | Take a queen from another player |
| 🐉 **Dragons** | Block knights | Defend against knight attacks |
| 🪄 **Wands** | Sleep queens | Put opponent's queen back to sleep |
| 🧪 **Potions** | Sleep own queens | Put your own queen to sleep (strategic) |
| 🔢 **Numbers** | Math equations | Create equations to draw more cards |

### Game Flow
1. **Join a game**: Enter a username and create/join a room
2. **Wait for players**: Games need 2-5 players to start
3. **Play your turn**: Use action cards or create math equations
4. **Defend wisely**: Save dragons to protect valuable queens
5. **Win the game**: First to meet win conditions wins!

## 🏗️ Project Structure

```
sleeping-queens/
├── src/
│   ├── domain/              # Core business logic (Clean Architecture)
│   │   ├── models/         # Domain entities (GameState, Player, Card)
│   │   ├── rules/          # Game rules and validation
│   │   ├── services/       # Domain services (TurnManager, etc.)
│   │   ├── events/         # Domain events
│   │   └── factories/      # Card and game factories
│   ├── application/        # Application layer
│   │   ├── commands/       # Command pattern implementations
│   │   ├── services/       # Game orchestration
│   │   ├── adapters/       # Adapters for domain
│   │   └── ports/          # Interface definitions
│   ├── infrastructure/     # External concerns
│   │   ├── persistence/    # Data storage
│   │   ├── logging/        # Debug logging
│   │   └── events/         # Event handling
│   ├── presentation/       # UI layer
│   │   └── components/     # React components
│   │       ├── game/       # Game UI components
│   │       └── lobby/      # Lobby components
│   ├── lib/                # Utilities and configurations
│   │   ├── context/        # React contexts
│   │   ├── hooks/          # Custom React hooks
│   │   └── supabase/       # Supabase client setup
│   ├── pages/              # Next.js pages and API routes
│   │   ├── api/            # Backend API endpoints
│   │   ├── game/           # Game pages
│   │   ├── index.tsx       # Landing page
│   │   └── lobby.tsx       # Game lobby
│   ├── services/           # Application services
│   └── styles/             # Global styles and Tailwind
├── .claude/                # Architecture documentation
├── supabase/               # Database migrations and seeds
└── public/                 # Static assets
```

## 🔧 Technical Architecture

### Clean Architecture
- **Domain Layer**: Pure business logic with no external dependencies
- **Application Layer**: Use cases and orchestration with command pattern
- **Infrastructure Layer**: Database, logging, and external services
- **Presentation Layer**: React components and UI logic

### Game Engine
- **Pure TypeScript**: Domain logic completely separated from UI
- **Immutable state**: All state changes return new state objects
- **Command Pattern**: Each move type has its own command class
- **Move validation**: Comprehensive validation in domain rules
- **Event-driven**: Domain events for game state changes

### Real-time System
- **Supabase Realtime**: WebSocket connections for instant updates
- **Server-side broadcasting**: Only server broadcasts game updates
- **Client subscriptions**: Clients only receive and react to updates
- **Optimistic updates**: Immediate UI feedback with rollback on errors

### State Management
- **React Context**: GameStateContext manages all game state
- **Custom hooks**: useAuth, useGameState for component access
- **Server authority**: Server is single source of truth
- **Session management**: Simple username-based authentication

## 🎨 Styling & Design

### Design System
- **Color palette**: Magical purples, pinks, and golds
- **Typography**: Cinzel font for medieval aesthetics
- **Cards**: Custom-designed with unique styling per type
- **Animations**: Smooth transitions and hover effects

### Responsive Design
- **Mobile-first**: Optimized for touch interactions
- **Breakpoints**: xs (475px), sm (640px), md (768px), lg (1024px)+
- **Card scaling**: Dynamic card sizes based on screen size
- **Layout adaptation**: Flexible layouts for all devices

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy**: Automatic deployments on git push

### Manual Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

### Database Setup
1. Create Supabase project
2. Run migrations from `supabase/migrations/`
3. Configure Row Level Security (RLS) policies
4. Set up Realtime for `games`, `players`, and `game_moves` tables

## 📝 API Reference

### Game Management
- `POST /api/games/create` - Create new game
- `POST /api/games/join` - Join existing game
- `GET /api/games/[id]/state` - Get game state
- `POST /api/games/[id]/move` - Submit game move

### Authentication
- `POST /api/auth/login` - Create user session

## 🧪 Testing

We maintain comprehensive test coverage across all architectural layers:

```bash
# Run all tests (25 test suites, 210+ tests)
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run specific test file
npm test src/domain/__tests__/cards.test.ts

# Type checking (Note: Some presentation layer types may need attention)
npm run type-check

# Linting - check for code quality issues
npm run lint

# Linting - automatically fix issues where possible
npm run lint:fix

# Build verification
npm run build
```

### Test Coverage
- **Domain Layer**: Complete coverage of game rules and validation
- **Application Layer**: Command execution and orchestration tests
- **Integration Tests**: Full game flow and multiplayer scenarios
- **Component Tests**: UI interactions and accessibility

### Test Categories
- **Unit Tests**: Domain models, rules, and services
- **Integration Tests**: Full game workflows and state transitions
- **Component Tests**: React component rendering and interactions
- **Architecture Tests**: Clean architecture compliance verification

See [TESTING.md](TESTING.md) for detailed testing documentation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🎉 Acknowledgments

- Original Sleeping Queens game by Gamewright
- Built with modern web technologies and lots of ✨
- Special thanks to the React, Next.js, and Supabase communities

## 💬 Support

For questions, bug reports, or feature requests, please:
1. Check existing [GitHub Issues](https://github.com/your-username/sleeping-queens/issues)
2. Create a new issue with detailed description

---

**Made with 💜 squarepegg** 

*Wake the queens, claim your victory!* 👑✨
