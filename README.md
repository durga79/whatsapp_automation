# WhatsApp Automation Platform

Enterprise-grade WhatsApp automation platform powered by **Wexa SDK**.

## Features

- 🔐 **Secure Authentication** - Login/signup with email verification
- 📱 **WhatsApp Integration** - Connect your WhatsApp Business API
- 🤖 **AgentFlows** - Create AI-powered automation workflows
- ⚡ **Real-time Executions** - Monitor and manage running automations
- 📤 **Quick Send** - Send WhatsApp messages directly

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Wexa account (for API access)

### Installation

```bash
# Clone/navigate to the project
cd whatsapp-automation

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Environment Variables

Create a `.env.local` file with:

```env
# Wexa API Base URL
NEXT_PUBLIC_BASE_URL=https://api.wexa.ai

# Optional: Redirect URL for email verification
NEXT_PUBLIC_VERIFY_REDIRECT_URL=https://your-app.com/verify
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## Architecture

```
whatsapp-automation/
├── app/
│   ├── (auth)/           # Login/Signup pages
│   ├── (dashboard)/      # Protected dashboard pages
│   │   ├── page.tsx              # Dashboard home
│   │   ├── whatsapp/config/      # WhatsApp configuration
│   │   ├── whatsapp/send/        # Quick send messages
│   │   ├── agentflows/create/    # Create AgentFlows
│   │   └── executions/           # Execution management
│   └── api/              # Next.js API routes
│       ├── auth/                 # Login/Signup endpoints
│       ├── whatsapp/             # WhatsApp operations
│       ├── agentflows/           # AgentFlow CRUD
│       └── executions/           # Execution management
├── components/
│   ├── AuthProvider.tsx  # Authentication context
│   └── Sidebar.tsx       # Navigation sidebar
├── lib/
│   └── wexa.ts          # Wexa SDK client helper
└── types/
    └── auth.ts          # TypeScript types
```

## Usage Flow

1. **Sign Up / Login** - Create account or sign in
2. **Configure WhatsApp** - Add your WhatsApp Business API credentials
3. **Create AgentFlow** - Design your automation workflow
4. **Start Execution** - Run your flow with input variables
5. **Monitor** - Track execution status and results

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **SDK**: Wexa SDK (TypeScript)
- **Icons**: Lucide React
- **Utilities**: clsx, tailwind-merge

## License

MIT
# whatsapp_automation
