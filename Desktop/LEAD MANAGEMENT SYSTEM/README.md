# Lead Distribution System

A production-ready Lead Distribution SaaS platform built with React, Node.js, Express, and MongoDB.

## Features

- **Lead Capture**: Form-based and webhook integration (GHL compatible)
- **Smart Distribution Engine**: Automatic lead assignment based on state and capacity
- **Client Management**: Full CRUD operations with lead caps and status tracking
- **Real-time Dashboard**: Live stats, activity feed, and auto-refresh
- **Authentication**: Secure JWT-based admin access
- **Modern UI**: Clean, responsive SaaS dashboard built with Tailwind CSS

## Tech Stack

**Frontend:**
- React 18 with Vite
- Tailwind CSS
- Axios
- React Router DOM

**Backend:**
- Node.js + Express
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs for password hashing

## Quick Start

### Prerequisites
- Node.js 16+ installed
- MongoDB instance (local or Atlas)

### Backend Setup

1. Navigate to backend directory:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
MONGO_URI=mongodb://localhost:27017/lead-distribution
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
```

4. Start the server:
```bash
npm start
# or for development with hot reload:
npm run dev
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Register new admin

### Leads
- `POST /api/leads` - Create and distribute a lead
- `GET /api/leads` - Get all leads (auth required)
- `POST /api/webhooks/lead` - Webhook for GHL integration

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `POST /api/clients/:id/reset` - Reset lead count

### Dashboard
- `GET /api/stats` - Get dashboard statistics
- `GET /api/activities` - Get recent activity feed

## Usage

### 1. First Time Setup
- Navigate to `http://localhost:3000/login`
- Enter username and password
- System will automatically create your admin account

### 2. Adding Clients
1. Go to **Clients** page
2. Click **+ Add Client**
3. Fill in client details (name, email, state, lead cap)
4. Submit to create client

### 3. Capturing Leads

**Via Form:**
1. Go to **Add Lead** page
2. Fill in lead information
3. Submit - system auto-assigns based on state/capacity

**Via Webhook (GHL Integration):**
```bash
curl -X POST http://localhost:5000/api/webhooks/lead \
  -H "Content-Type: application/json" \
  -d '{
    "contact_name": "John Doe",
    "email": "john@example.com",
    "phone": "+15551234567",
    "state": "TX",
    "source": "webhook"
  }'
```

### 4. Distribution Logic
Leads are automatically assigned to:
- Clients matching the lead's state
- Clients with remaining capacity (leadsReceived < leadCap)
- System prioritizes clients with lowest lead count

If no client is available, lead is marked as "unassigned"

## Project Structure

```
Lead Management System/
├── Backend/
│   ├── models/
│   │   ├── Client.js
│   │   ├── Lead.js
│   │   ├── User.js
│   │   └── Activity.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   ├── Topbar.jsx
    │   │   ├── StatsCards.jsx
    │   │   ├── ClientsTable.jsx
    │   │   └── ActivityFeed.jsx
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── Clients.jsx
    │   │   ├── Leads.jsx
    │   │   ├── AddLead.jsx
    │   │   └── Login.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

## Deployment

### Backend (Render/Railway)

1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `PORT`

### Frontend (Vercel/Netlify)

1. Import project from GitHub
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable:
   - `VITE_API_URL=https://your-backend-url.com/api`

## Environment Variables

### Backend (.env)
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lead-distribution
PORT=5000
JWT_SECRET=super-secret-jwt-key-12345
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## Features in Detail

### Lead Distribution Engine
- **State-based routing**: Leads matched to clients by US state
- **Capacity enforcement**: Prevents over-assignment
- **Load balancing**: Distributes evenly among eligible clients
- **Fallback handling**: Unassigned leads tracked separately

### Dashboard Features
- **Real-time stats**: Auto-refresh every 5 seconds
- **Activity feed**: Track all system events
- **Client overview**: Quick status at a glance
- **Color-coded status**: Green (Active), Red (Full)

### Client Management
- **Status tracking**: Active, Full, Inactive
- **Lead caps**: Configurable per client
- **Reset functionality**: Reset lead counts easily
- **Bulk operations**: View, edit, delete clients

## Performance Considerations

- **Async processing**: Non-blocking lead distribution
- **Database indexes**: Optimized for state and capacity queries
- **Auto-refresh**: Configurable polling intervals
- **Error handling**: Graceful degradation

## Security

- JWT token authentication
- Password hashing with bcrypt
- Protected API routes
- CORS configuration
- Input validation

## License

MIT License - Feel free to use and modify for your projects.

## Support

For issues or questions, please check:
- API endpoints and response formats
- MongoDB connection settings
- Environment variable configuration
- Browser console for frontend errors

## Future Enhancements

- [ ] Email/SMS notification integrations
- [ ] Lead scoring and prioritization
- [ ] Advanced analytics and reporting
- [ ] Multi-tenant support
- [ ] API rate limiting
- [ ] Lead re-assignment logic
- [ ] Export functionality (CSV/Excel)
- [ ] Custom webhook transformations
