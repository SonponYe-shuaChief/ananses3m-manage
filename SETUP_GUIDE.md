# AMAYA Orders Manager - Setup Guide

A lightweight SaaS-ready web app for small creative/production teams to manage orders, assignments, and supplies.

## Quick Start

### 1. Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### 2. Installation

```bash
# Clone or download the project
cd ananses3m-manage

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Update your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Run the database setup SQL from `DATABASE_SETUP.md` in your Supabase SQL Editor

### 4. Add Logo

Replace `/public/amaya.png` with your company logo (recommended: 512x512px square image)

### 5. Run the Application

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

### For Managers
- **Company Setup**: Create company and invite team members
- **Order Management**: Create, assign, and track orders with detailed specs
- **Team Management**: Invite workers, manage assignments
- **Analytics Dashboard**: Overview of orders, deadlines, and team performance
- **Image Uploads**: Attach reference images to orders

### For Workers
- **My Orders**: View assigned orders and general tasks
- **Mark Complete**: Star orders when done (manager controls official status)
- **Order Details**: Access all order information, specs, and images
- **Dashboard**: See today's work and priorities

### Technical Features
- **Multi-tenant**: Secure company-based data isolation
- **Real-time**: Supabase realtime subscriptions for instant updates
- **PWA Ready**: Service worker and manifest for mobile app experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Role-based Access**: Different interfaces for managers and workers

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Routing**: React Router v6
- **State Management**: React Context + Hooks
- **Notifications**: React Hot Toast
- **PWA**: Vite PWA Plugin

### Project Structure
```
src/
├── components/
│   ├── AuthGuard.jsx      # Route protection
│   └── Layout.jsx         # Main app layout
├── hooks/
│   └── useAuth.js         # Authentication logic
├── lib/
│   └── supabaseClient.js  # Supabase configuration
├── pages/
│   ├── Login.jsx          # Sign in/up page
│   ├── Dashboard.jsx      # Role-based dashboard
│   ├── Orders.jsx         # Order management
│   ├── Profile.jsx        # User profile
│   └── Settings.jsx       # Company settings
├── App.jsx                # Main app component
├── main.jsx              # App entry point
└── index.css             # Global styles
```

### Database Schema
- **companies**: Company information
- **profiles**: User profiles linked to companies
- **orders**: Order details and specifications
- **order_assignments**: Worker assignments with completion tracking
- **invitations**: Team invitation system
- **buy_list**: Supply management (optional)

## Configuration

### Environment Variables
```env
# Required
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Tailwind CSS Classes
Custom utility classes defined in `src/index.css`:
- `.input-field` - Styled form inputs
- `.btn-primary` - Primary buttons
- `.btn-secondary` - Secondary buttons
- `.card`, `.card-header`, `.card-body` - Card components
- `.badge-*` - Status badges

## 🔐 Security

### Authentication
- Supabase Auth handles user signup, login, and sessions
- Email confirmation can be enabled in Supabase settings
- Password reset functionality included

### Authorization
- Row Level Security (RLS) ensures data isolation between companies
- Role-based access control (managers vs workers)
- Secure invitation system with expiring codes

### Data Protection
- All database queries use RLS policies
- File uploads restricted to authenticated users
- Company-based multi-tenancy prevents data leaks

## 📚 Usage

### Getting Started as a Manager

1. **Sign Up**: Create account and choose "Create new company"
2. **Company Setup**: Enter your company name
3. **Invite Team**: Go to Settings > Team Members > Invite Member
4. **Create Orders**: Go to Orders > Create Order
5. **Assign Work**: Choose "Specific Workers" or "General" assignment
6. **Track Progress**: Monitor completion on Dashboard

### Getting Started as a Worker

1. **Get Invitation**: Receive invitation code from manager
2. **Sign Up**: Create account and choose "Join existing company"
3. **Enter Code**: Use the invitation code provided
4. **View Orders**: See assigned work on Dashboard and Orders page
5. **Mark Complete**: Star orders when finished (manager updates official status)

### Order Management

#### Creating Orders (Managers)
- Fill in order details: title, client, due date, priority
- Add specifications in the details field
- Upload reference images if needed
- Choose assignment type:
  - **General**: All workers can see and work on it
  - **Specific**: Only assigned workers can see it

#### Working on Orders (Workers)
- View order details and specifications
- Check reference images
- Mark as done when completed (checkmark button)
- Manager will update official status

## Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel via their CLI or GitHub integration
```

### Netlify
```bash
npm run build
# Drag and drop the dist/ folder to Netlify
```

### Other Hosts
```bash
npm run build
# Upload the dist/ folder to your web host
```

### Environment Variables for Production
Make sure to set the environment variables in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🧪 Development

### Running Tests
```bash
# Install development dependencies
npm install

# Run linting
npm run lint
```

### Adding Features
1. Follow the existing component structure
2. Use the established Tailwind CSS patterns
3. Implement proper error handling with toast notifications
4. Add loading states for async operations
5. Ensure RLS policies cover new database queries

### Database Changes
1. Update the SQL schema in `DATABASE_SETUP.md`
2. Test changes in Supabase SQL Editor
3. Update TypeScript types if using TypeScript
4. Add RLS policies for new tables/columns

## 🐛 Troubleshooting

### Common Issues

**"Missing Supabase environment variables"**
- Check that `.env` file exists and has correct values
- Verify environment variable names start with `VITE_`

**"Failed to load settings data"**
- Ensure database setup was completed
- Check RLS policies are applied
- Verify user has a profile record

**"Invalid or expired invitation code"**
- Check invitation exists in database
- Verify `is_used` is false and `expires_at` is in future
- Ensure invitation belongs to correct company

**Images not loading**
- Verify Supabase Storage bucket is created
- Check storage RLS policies
- Ensure images are uploaded to correct bucket

### Development Tips
- Use browser dev tools Network tab to debug API calls
- Check Supabase logs for database errors
- Use React Developer Tools for component debugging
- Test with multiple users/companies to verify isolation

## License

This project is created for educational and business use. Customize and deploy as needed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues or questions:
1. Check this README and `DATABASE_SETUP.md`
2. Review the Supabase documentation
3. Check browser console for error messages
4. Verify database setup and RLS policies