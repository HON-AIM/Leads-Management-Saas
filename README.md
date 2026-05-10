# Lead Distribution SaaS - Multi-Tenant Architecture

A production-grade, multi-tenant Lead Distribution SaaS platform with comprehensive authentication, role-based access control, and secure tenant isolation.

## 🚀 Features

### Authentication & Security
- **JWT Access & Refresh Tokens**: Secure token-based authentication with automatic rotation
- **Role-Based Access Control**: Super Admin, Tenant Admin, Buyer, Viewer roles
- **Multi-Tenant Isolation**: Complete data separation between tenants
- **Account Security**: Password hashing, account locking, email verification
- **Secure Cookies**: HttpOnly, Secure, SameSite cookies for token storage

### Multi-Tenancy
- **Tenant Management**: Create and manage isolated tenant environments
- **Data Isolation**: Every resource belongs to a tenant with strict access controls
- **Subscription Management**: Plan-based feature access and usage limits
- **Tenant Context**: Automatic tenant resolution from domain/subdomain

### Lead Distribution Engine
- **Smart Assignment**: Automatic lead routing based on state and capacity
- **Real-time Processing**: Instant lead assignment with fallback handling
- **State Normalization**: Intelligent US state code standardization
- **Capacity Management**: Lead caps and overflow handling

### User Management
- **User Lifecycle**: Registration, verification, password reset flows
- **Profile Management**: User profiles with role assignments
- **Admin Controls**: User creation, deactivation, password resets
- **Audit Trail**: Comprehensive activity logging

## 🛠 Tech Stack

**Frontend:**
- React 18 with Vite
- Tailwind CSS for styling
- Axios for API calls
- React Router for navigation

**Backend:**
- Node.js + Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- bcryptjs for password hashing
- cookie-parser for secure cookies
- nodemailer for email services

**Security:**
- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization
- Rate limiting (recommended)

## 📋 Prerequisites

- Node.js 16+
- MongoDB (local or Atlas)
- npm or yarn

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/lead-distribution-saas

# JWT Secrets (generate strong random strings)
JWT_ACCESS_SECRET=your-super-secure-access-secret-key-32-chars-min
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-32-chars-min
JWT_SECRET=fallback-secret-for-legacy-compatibility

# Server
PORT=5000
NODE_ENV=development

# Email (for notifications and verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FROM_EMAIL=noreply@yourapp.com

# Frontend
FRONTEND_URL=http://localhost:5173

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 2. Installation

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Database Initialization

```bash
# Start the server (will auto-initialize roles and default tenant)
npm start
```

The system will automatically create:
- System roles (super_admin, tenant_admin, buyer, viewer)
- Default tenant ("default")
- Super admin user (username: "admin", password: "admin123")

### 4. Start Development Servers

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

## 📚 API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Login with username/password, returns JWT tokens in secure cookies.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "role": "super_admin",
    "tenantId": "...",
    "tenantName": "Default Tenant"
  },
  "message": "Login successful"
}
```

#### POST /api/auth/refresh
Refresh access token using refresh token from cookies.

#### POST /api/auth/logout
Logout and revoke refresh token.

#### POST /api/auth/register
Register new user (requires tenant context).

#### POST /api/auth/forgot-password
Request password reset email.

#### POST /api/auth/reset-password
Reset password with token.

### Tenant Management (Super Admin Only)

#### POST /api/tenants
Create new tenant.

#### GET /api/tenants
List all tenants with pagination.

#### GET /api/tenants/:id
Get tenant details.

#### PUT /api/tenants/:id
Update tenant.

#### POST /api/tenants/:id/suspend
Suspend tenant.

#### POST /api/tenants/:id/activate
Activate tenant.

### User Management

#### POST /api/users
Create user in tenant (Tenant Admin).

#### GET /api/users
List users in tenant.

#### PUT /api/users/:id
Update user.

#### DELETE /api/users/:id
Delete user.

#### PATCH /api/users/:id/status
Set user active/inactive status.

### Role Management

#### GET /api/roles
List available roles.

#### POST /api/roles
Create custom role (Tenant Admin).

#### PUT /api/roles/:id
Update role.

#### DELETE /api/roles/:id
Delete role.

### Lead Management

#### POST /api/leads
Submit new lead (public endpoint with optional tenant context).

#### GET /api/leads
List leads in tenant (authenticated).

#### DELETE /api/leads/:id
Delete lead.

### Client Management

#### GET /api/clients
List clients in tenant.

#### POST /api/clients
Create new client.

#### PUT /api/clients/:id
Update client.

#### DELETE /api/clients/:id
Delete client.

#### POST /api/clients/:id/reset
Reset client lead counter.

### Analytics

#### GET /api/stats
Get dashboard statistics for tenant.

#### GET /api/activities
Get activity feed for tenant.

## 🔐 Security Features

### Authentication Flow
1. User logs in with username/password
2. Server validates credentials and account status
3. JWT access token (15min) and refresh token (7 days) issued
4. Access token sent in Authorization header or secure cookie
5. Refresh token stored in secure HttpOnly cookie
6. Automatic token rotation on refresh

### Account Security
- **Password Hashing**: bcrypt with 12 rounds
- **Account Locking**: 5 failed attempts = 2 hour lock
- **Email Verification**: Required for new accounts
- **Password Reset**: Secure token-based flow
- **Session Management**: Logout from all devices option

### Multi-Tenant Security
- **Data Isolation**: All queries filtered by tenantId
- **Access Control**: Users can only access their tenant's data
- **Role Validation**: Permissions checked per operation
- **Audit Logging**: All actions tracked with tenant context

## 🏗 Architecture

### Database Schema

#### Tenants
```javascript
{
  name: String,
  domain: String, // Unique identifier
  description: String,
  status: ['active', 'suspended', 'inactive'],
  settings: {
    maxUsers: Number,
    maxLeadsPerMonth: Number,
    features: Object
  },
  subscription: {
    plan: String,
    expiresAt: Date
  }
}
```

#### Users
```javascript
{
  username: String,
  email: String,
  password: String, // Hashed
  tenantId: ObjectId, // Reference to Tenant
  role: ObjectId, // Reference to Role
  status: ['active', 'inactive', 'suspended', 'pending_verification'],
  emailVerified: Boolean,
  refreshTokens: Array,
  failedLoginAttempts: Number,
  lockUntil: Date
}
```

#### Roles & Permissions
- Hierarchical permission system
- System roles: super_admin, tenant_admin, buyer, viewer
- Custom tenant roles supported
- Permission-based access control

### Middleware Stack

1. **CORS**: Configured allowed origins
2. **Cookie Parser**: Secure cookie handling
3. **Tenant Resolver**: Domain-based tenant identification
4. **Authentication**: JWT token validation
5. **Authorization**: Role and permission checking
6. **Tenant Isolation**: Automatic tenant filtering

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<strong-random-64-char-string>
JWT_REFRESH_SECRET=<different-strong-random-64-char-string>
EMAIL_HOST=smtp.sendgrid.net
EMAIL_USER=apikey
EMAIL_PASS=SG.your-sendgrid-api-key
ALLOWED_ORIGINS=https://yourapp.com,https://app.yourapp.com
FRONTEND_URL=https://app.yourapp.com
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🧪 Testing

### Default Login Credentials
- **Username**: admin
- **Password**: admin123
- **Role**: super_admin

### API Testing
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  --cookie-jar cookies.txt

# Get stats (uses cookies)
curl -X GET http://localhost:5000/api/stats \
  --cookie cookies.txt
```

## 📝 Development Notes

### Adding New Permissions
1. Add to Permission model initialization in `RoleService.initializeSystemRoles()`
2. Assign to appropriate roles
3. Use `requirePermission('resource', 'action')` middleware

### Tenant Context
- Public endpoints use `optionalTenant` middleware
- Protected endpoints use `tenantIsolation` middleware
- All data operations automatically filtered by `req.tenantId`

### Error Handling
- Consistent error response format: `{ message: "error description" }`
- HTTP status codes: 400 (bad request), 401 (unauth), 403 (forbidden), 404 (not found), 500 (server error)

## 🤝 Contributing

1. Follow the established patterns for authentication and tenant isolation
2. Add appropriate middleware to new routes
3. Include tenantId in all data models
4. Test with multiple tenant contexts
5. Update API documentation

## 📄 License

ISC License
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
