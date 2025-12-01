# RBAC Demo - Complete Role-Based Access Control System

A full-stack RBAC (Role-Based Access Control) application with JWT authentication, SQL Server database, Bootstrap 5 UI, and comprehensive user management features.

## 🎯 Features

### Authentication & Authorization

- **JWT Token-based authentication** with HS256 algorithm (1-hour expiry)
- **Role-Based Access Control** (Admin, Manager, Staff, Customer)
- **Permission-based UI rendering** - buttons show/hide based on user permissions
- **Server-side middleware protection** - API endpoints enforce permissions
- **Persistent login sessions** using localStorage with token
- **Automatic token expiry handling** - redirects to login on expired sessions
- **Profile & Settings pages** - user account management

### User Roles & Permissions

- **Admin**: Full access (View, Edit, Add, Delete) + Admin Dashboard + Permission Management
- **Manager**: View, Edit, Add (no Delete, no Admin Dashboard)
- **Staff**: View, Add only
- **Customer**: View only

### Modern UI Pages

- **Login Page**: Animated SVG avatar with eye-tracking animation
- **Dashboard**: Role-based menu with colored buttons and hover effects
- **Orders Management**: Server-side pagination, sorting, search with Bootstrap tables
- **Customers Management**: Full CRUD with pagination, filtering, and responsive design
- **Profile Page**: User information display, password change, session statistics
- **Settings Page**: Appearance, notifications, security, accessibility preferences
- **Admin Dashboard**: Vietnamese-labeled tabs for managing users, roles, and permissions
- **Create Custom Permissions**: Dynamic permission creation for any module

### Technical Stack

- **Backend**: Node.js + Express 5
- **Database**: SQL Server (mssql) with parameterized queries
- **Authentication**: JWT (jsonwebtoken) + bcrypt password hashing
- **Frontend**: Vanilla JavaScript, Bootstrap 5.3, GSAP animations
- **Icons**: Bootstrap Icons
- **Pagination**: Server-side with sorting and search
- **Security**: Input validation, XSS protection, SQL injection prevention, asyncHandler error handling

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- SQL Server (with TCP/IP enabled on port 1433)
- SQL Server Management Studio (optional, for database management)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd demo
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure database connection**

   Edit `.env` file with your SQL Server credentials:

   ```env
   DB_SERVER=localhost
   DB_DATABASE=RBACDemo
   DB_USER=sa
   DB_PASSWORD=your_password
   DB_PORT=1433
   DB_ENCRYPT=true
   DB_TRUST_CERT=true
   JWT_SECRET=your_secret_key_change_this
   BCRYPT_ROUNDS=10
   ```

4. **Initialize the database**

   This script will:

   - Create all tables (Users, Roles, Permissions, Orders, etc.)
   - Seed demo data (roles, permissions, users)
   - Hash passwords for all users
   - Create sample orders

   ```bash
   npm run db:init
   ```

5. **Start the development server**

   ```bash
   npm run dev
   # OR for production
   npm start
   ```

6. **Access the application**

   Open your browser to: `http://localhost:3000`

   The app will automatically redirect to the login page.

## 🔐 Test Credentials

All users have the password: **Password123!**

| Username | Role     | Permissions             | Dashboard Access | Profile/Settings |
| -------- | -------- | ----------------------- | ---------------- | ---------------- |
| admin    | Admin    | View, Edit, Add, Delete | ✅ Yes           | ✅ Yes           |
| manager  | Manager  | View, Edit, Add         | ❌ No            | ✅ Yes           |
| staff    | Staff    | View, Add               | ❌ No            | ✅ Yes           |
| customer | Customer | View only               | ❌ No            | ✅ Yes           |

## 🧪 How to Test the Application

### 1. **Test Authentication**

```bash
# Login with different users
1. Navigate to http://localhost:3000
2. Try each user (admin/manager/staff/customer)
3. Password: Password123!
4. Verify correct menu buttons appear based on role
```

### 2. **Test Permissions**

```bash
# Test permission enforcement
1. Login as 'customer' (View only)
   - Verify you can see list but no Add/Edit/Delete buttons
2. Login as 'staff' (View + Add)
   - Verify you see View and Add buttons only
3. Login as 'manager' (View + Add + Edit)
   - Verify you see all buttons except Delete
4. Login as 'admin' (Full access)
   - Verify all buttons visible + Admin Dashboard access
```

### 3. **Test Orders Module**

```bash
# Test CRUD operations
1. Login as admin
2. Click "List Orders"
3. Test pagination (5/10/20/50 items per page)
4. Test sorting (click column headers)
5. Test search (enter order ID or item name)
6. Click "Create Order" and add new order
7. Click "Update Order" and edit existing
8. Click "Delete Order" and confirm deletion
```

### 4. **Test Customers Module**

```bash
# Test customer management
1. Login as admin
2. Click "Customers"
3. Test server-side pagination
4. Test search functionality
5. Click "New Customer" to add
6. Use inline edit buttons to update
7. Use delete button with confirmation
```

### 5. **Test Profile & Settings**

```bash
# Test user account features
1. Login as any user
2. Click username dropdown → Profile
   - View user information
   - Check roles and permissions display
   - Test password change functionality
3. Click username dropdown → Settings
   - Change theme (Light/Dark/Auto)
   - Adjust font size
   - Test notification preferences
   - Clear cache
```

### 6. **Test Admin Dashboard**

```bash
# Test admin-only features
1. Login as admin
2. Click "Admin Dashboard"
3. Navigate tabs:
   - Quản lý Người dùng (User Management)
   - Quản lý Quyền (Permissions)
   - Quản lý Chức năng (Modules)
   - Gán Chức năng (Assign Permissions)
4. Test "Thêm Quyền mới" (Add New Permission)
   - Select permission type (View/Add/Edit/Delete)
   - Enter module name
   - Create permission
   - Verify it appears in list
```

### 7. **Test Token Expiry**

```bash
# Test session handling
1. Login and note the time
2. Wait 1 hour (or modify JWT expiry to 1 minute for testing)
3. Try to navigate to any page
4. Verify automatic redirect to login with message
```

### 8. **Test Error Handling**

```bash
# Test various error scenarios
1. Try invalid login credentials
2. Try accessing admin page as non-admin
3. Try creating order without required fields
4. Try deleting non-existent record
5. Verify appropriate error messages display
```

### 9. **Test API Endpoints Directly**

```bash
# Using curl or Postman

# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Password123!"}'

# Test protected endpoint (use token from login)
curl http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Test health check
curl http://localhost:3000/health
```

### 10. **Test Database Scripts**

```bash
# Test database utilities
npm run db:test      # Verify database connection
npm run login:test   # Test login functionality
npm run user:set     # Change user password (interactive)
```

## 📁 Project Structure

```
demo/
├── src/
│   ├── server.js           # Express server with all API routes & error handling
│   ├── config.js           # Database and JWT configuration
│   ├── db.js               # SQL Server connection pool
│   ├── authMiddleware.js   # JWT authentication middleware
│   ├── rbacService.js      # Authentication service (login, token verification)
│   ├── rbacRepository.js   # Database queries (users, roles, orders, customers CRUD)
│   └── permissions.js      # Permission definitions (reference only)
├── public/
│   ├── login.html          # Login page with animated avatar
│   ├── profile.html        # User profile with password change
│   ├── settings.html       # User settings and preferences
│   ├── admin.html          # Admin dashboard (Admin only)
│   ├── list-orders.html    # Orders list with pagination & search
│   ├── list-customers.html # Customers list with pagination & search
│   ├── create-order.html   # Create new order form
│   ├── create-customer.html # Create new customer form
│   ├── update-order.html   # Update existing order
│   ├── update-customer.html # Update existing customer
│   ├── delete-order.html   # Delete order confirmation
│   ├── delete-customer.html # Delete customer confirmation
│   ├── js/
│   │   ├── login.js        # Login logic + post-login menu
│   │   ├── profile.js      # Profile page logic with password change
│   │   ├── settings.js     # Settings page logic with preferences
│   │   ├── admin.js        # Admin dashboard logic
│   │   ├── list-orders.js  # Orders pagination & search logic
│   │   ├── list-customers.js # Customers pagination & search logic
│   │   ├── create-order.js # Create order logic
│   │   ├── create-customer.js # Create customer logic
│   │   ├── update-order.js # Update order logic
│   │   ├── update-customer.js # Update customer logic
│   │   ├── delete-order.js # Delete order logic
│   │   └── delete-customer.js # Delete customer logic
│   └── css/
│       ├── login.css       # Login page styles
│       └── admin.css       # Admin dashboard styles
├── db/
│   └── schema.sql          # Complete database schema + seed data
├── scripts/
│   ├── init-db.js          # Database initialization script
│   ├── test-db.js          # Test database connection
│   ├── set-password.js     # Utility to set user password
│   └── test-login.js       # Test login API
├── tests/
│   └── rbac.test.js        # Jest tests
├── .env                    # Environment variables (create from .env.example)
├── package.json            # Dependencies and scripts
├── TESTING.md              # Detailed testing guide
├── BUGFIXES_APPLIED.md     # Automatic bug fixes documentation
└── README.md               # This file
```

## 🛠️ Available Scripts

```bash
npm run dev         # Start development server with nodemon
npm start           # Start production server
npm run db:init     # Initialize database (run once)
npm run db:test     # Test database connection
npm test            # Run Jest tests
npm run user:set    # Set password for a user
npm run login:test  # Test login API
```

## 🔒 Security Features

1. **Password Hashing**: All passwords hashed with bcrypt (10 rounds)
2. **JWT Tokens**: Secure token-based authentication (1-hour expiry)
3. **Token Expiry Handling**: Automatic redirect to login on expired sessions
4. **Input Validation**: Server-side validation for all inputs (type, length, format)
5. **SQL Injection Protection**: Parameterized queries with mssql
6. **XSS Prevention**: HTML escaping on all user-generated content
7. **CORS Headers**: Security headers on all responses
8. **Payload Size Limit**: 10KB max request body size
9. **Permission Enforcement**: Both client-side (UI) and server-side (API)
10. **AsyncHandler**: Prevents unhandled promise rejections
11. **Error Logging**: Centralized logging with context
12. **Session Management**: Complete token cleanup on logout

## 📊 Database Schema

### Core Tables

- **Users**: User accounts with hashed passwords
- **Roles**: Admin, Manager, Staff, Customer
- **Permissions**: View, Edit, Add, Delete (per module)
- **RolePermissions**: Many-to-many mapping of roles to permissions
- **UserRoles**: Many-to-many mapping of users to roles
- **Orders**: Sample data table for CRUD operations
- **Customers**: Customer management with full CRUD support

### Sample Data

- 4 demo users (admin, manager, staff, customer)
- 4 roles with proper permission assignments
- 8 permissions (4 for Order module, 4 for Customer module)
- 3 sample orders
- Sample customers

### Key Features

- **Server-side Pagination**: Efficient OFFSET/FETCH queries
- **Search**: LIKE queries on multiple columns
- **Sorting**: Dynamic ORDER BY with whitelisted columns
- **Audit Trail**: created_at, updated_at, created_by fields

## 🎨 UI Features

### Design System

- **Framework**: Bootstrap 5.3
- **Primary Color**: #0d6efd (blue)
- **Danger Color**: #dc3545 (red)
- **Success**: #198754 (green)
- **Warning**: #ffc107 (yellow)
- **Info**: #0dcaf0 (cyan)
- **Theme Support**: Light/Dark/Auto modes
- **Responsive**: Mobile-first design with Bootstrap breakpoints

### Animations

- Eye-tracking avatar on login page (GSAP)
- Smooth transitions and hover effects
- Button hover animations with gradient backgrounds
- Loading states with Bootstrap spinners
- Table row hover effects

### User Experience

- **Pagination**: 5/10/20/50/100 items per page
- **Search**: Real-time filtering with debounce
- **Sorting**: Click column headers to sort
- **Notifications**: Toast messages for success/error
- **Session Timer**: Live session duration counter
- **Auto-save**: Settings save automatically

## 🧪 Testing

See test instructions above for comprehensive testing guide.

### Quick Test Commands

```bash
# Database connection
npm run db:test

# Login API
npm run login:test

# Run Jest tests
npm test

# Health check
curl http://localhost:3000/health
```

### Expected Test Results

✅ **All users can login**  
✅ **Permissions enforce correctly**  
✅ **Pagination works on all lists**  
✅ **Search filters data correctly**  
✅ **Token expiry redirects to login**  
✅ **Profile page displays user info**  
✅ **Password change works**  
✅ **Settings persist across sessions**  
✅ **Admin can create permissions**  
✅ **Non-admins cannot access admin dashboard**

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connection
npm run db:test

# Check SQL Server is running
# Verify TCP/IP is enabled on port 1433
# Check firewall allows SQL Server traffic
```

### Permission Errors

```bash
# Reinitialize database to reset permissions
npm run db:init
```

### Login Issues

```bash
# Test login API directly
npm run login:test

# Verify passwords are hashed
# Check JWT_SECRET in .env
```

## 📚 API Documentation

### Authentication

- `POST /auth/login` - Login with username and password
  - Body: `{ username, password }`
  - Returns: `{ token, user: { username, roles, permissions } }`
- `GET /auth/profile` - Get current user profile (requires auth)
  - Returns: `{ userId, username, roles, permissions }`
- `POST /auth/change-password` - Change user password (requires auth)
  - Body: `{ currentPassword, newPassword }`

### Orders (Protected - requires Order module permissions)

- `GET /orders?page=1&pageSize=10&sort=created_at&dir=desc&search=` - List orders with pagination
- `POST /orders` - Create order (requires Add permission)
- `PUT /orders/:id` - Update order (requires Edit permission)
- `DELETE /orders/:id` - Delete order (requires Delete permission)

### Customers (Protected - requires Customer module permissions)

- `GET /customers?page=1&pageSize=10&sort=created_at&dir=desc&search=` - List customers with pagination
- `POST /customers` - Create customer (requires Add permission)
- `PUT /customers/:id` - Update customer (requires Edit permission)
- `DELETE /customers/:id` - Delete customer (requires Delete permission)

### Admin (Admin Role Only)

- `GET /admin/users` - List users with roles
- `GET /admin/roles` - List all roles
- `GET /admin/permissions` - List all permissions
- `POST /admin/permissions` - Create new permission
  - Body: `{ name_permission: "View"|"Add"|"Edit"|"Delete", module: "ModuleName" }`
- `GET /admin/modules` - List all modules
- `GET /admin/role-permissions?roleId=X` - Get permissions for role
- `POST /admin/role-permissions` - Update role permissions
  - Body: `{ roleId, permissionIds: [1,2,3] }`

### Health Check

- `GET /health` - Check server and database status
  - Returns: `{ status: "ok", database: "connected", timestamp }`

## 🤝 Contributing

This is a demo project for learning RBAC concepts. Feel free to:

- Fork and extend with new features
- Add more modules beyond "Order"
- Implement additional roles
- Enhance the UI with more animations

## 📄 License

ISC License

## 🙋 Support

For issues or questions:

1. Check [TESTING.md](./TESTING.md) for common scenarios
2. Review error logs in console
3. Verify database connection and schema
4. Ensure all dependencies are installed

---

**Built with ❤️ for learning RBAC concepts**
