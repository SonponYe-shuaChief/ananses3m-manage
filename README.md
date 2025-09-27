# 🚀 Anansesɛm Orders Manager

A full-stack Progressive Web App (PWA) for team order management and collaboration, built with React (Vite + Tailwind CSS) and Supabase.

## ✨ Features

- **🔐 Role-based Authentication** - Manager and Worker roles with different permissions
- **📋 Order Management** - Create, assign, and track orders with images and priorities
- **⭐ Smart Assignment System** - Workers can star orders for quick access
- **🛒 Shared Buy List** - Team shopping list with real-time updates
- **📊 Analytics Dashboard** - Performance metrics and insights (Manager only)
- **📱 Progressive Web App** - Installable, offline-ready experience
- **⚡ Real-time Updates** - Live synchronization across all devices

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Database**: PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for order images
- **PWA**: Service Worker + Web App Manifest

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd ananses3m-manage
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env` with your credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

1. Go to your Supabase SQL Editor
2. Run the SQL commands from `supabase-schema-complete.sql`
3. Optionally run `supabase-auto-org-update.sql` for enhanced organization management
4. This will create all tables, policies, storage buckets, and functions

### 4. User Registration

- **No organization ID required!** 📝
- Each new user automatically gets their own organization
- Managers can invite users to join existing organizations
- Simplified signup process - just email, password, name, and role

### 5. Run the App

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app!

## 📱 PWA Installation

The app is installable as a PWA on desktop and mobile devices. Users will see an install prompt or can install manually from their browser menu.

## 👥 User Roles

### 🧑‍💼 Manager
- Create and manage orders
- Assign orders to workers
- View team analytics
- Full CRUD operations on orders
- Access to analytics dashboard

### 👷 Worker  
- View assigned orders
- Star important orders
- Mark orders as completed (starred)
- Add items to shared buy list
- Personal statistics view

## 🗂️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.jsx
│   ├── OrderCard.jsx
│   ├── OrderForm.jsx
│   └── BuyListItem.jsx
├── pages/              # Main application pages
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Orders.jsx
│   ├── BuyList.jsx
│   └── Analytics.jsx
├── context/            # React Context providers
│   └── AuthContext.jsx
├── hooks/              # Custom React hooks
│   ├── useOrders.js
│   ├── useAssignments.js
│   └── useBuyList.js
├── utils/              # Utility functions
│   └── supabaseClient.js
└── styles/
    └── index.css       # Tailwind CSS styles
```

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- **Organization-based data isolation**
- **Role-based access control**
- **Secure file uploads** with Supabase Storage
- **JWT-based authentication**

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Netlify

1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Configure environment variables

## 🔧 Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📊 Database Schema

The app uses the following main tables:

- `profiles` - User profiles with organization and role info
- `orders` - Order details with status, priority, and images
- `order_assignments` - Many-to-many relationship between orders and workers
- `buy_list` - Shared team shopping list items

## 🚀 Future Enhancements

- 📧 Email notifications for new assignments
- 📱 Push notifications
- 🤖 AI-powered order prioritization
- 📈 Advanced analytics and reporting
- 🌍 Multi-language support
- 📊 Export functionality

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include steps to reproduce any bugs

---

**Happy Order Managing! 🎉**+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
