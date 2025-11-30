# Server Setup & MongoDB

This guide covers how to run the backend server and MongoDB locally on Windows.

## Prerequisites

- **Node.js** (v14+): Download from [nodejs.org](https://nodejs.org)
- **MongoDB** (local or Atlas): 
  - Option 1: MongoDB Community Edition installed locally
  - Option 2: MongoDB Atlas (cloud) — free tier at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

---

## Option 1: MongoDB Locally (Windows)

### 1.1 Install MongoDB Community Edition

1. Go to [MongoDB Community Server Download](https://www.mongodb.com/try/download/community)
2. Select **Windows**, latest stable version
3. Run the installer; choose **Complete** installation
4. During setup, check **Install MongoDB as a Service** (optional but recommended)

### 1.2 Start MongoDB Service

**If installed as a service:**
- Open **Services** (`services.msc`), find "MongoDB Server", right-click → **Start**
- Or use PowerShell:
  ```powershell
  Start-Service MongoDB
  ```

**Or run manually:**
- Open PowerShell and run:
  ```powershell
  mongod
  ```
- Leave this terminal open; MongoDB will listen on `mongodb://localhost:27017` by default

### 1.3 Verify MongoDB is Running

```powershell
mongosh
```
If it connects, you'll see a prompt. Type `exit` to quit.

---

## Option 2: MongoDB Atlas (Cloud)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a **Cluster** (M0 Tier is free)
4. In **Security**, add your IP address to the whitelist
5. Create a **Database User** (username & password)
6. Click **Connect** and copy the connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/room_expense?retryWrites=true&w=majority
   ```

---

## Server Setup

### 2.1 Install Dependencies

Open PowerShell, navigate to the server folder, and install packages:

```powershell
cd 'C:\.ME\Angular\dummy trail\Room.12\server'
npm install
```

This will install:
- express
- mongoose
- bcrypt
- jsonwebtoken
- cors
- dotenv

### 2.2 Create `.env` File

In `server/` folder, create a `.env` file with:

```
MONGODB_URI=mongodb://localhost:27017/room_expense
JWT_SECRET=your_super_secret_key_change_this_in_production
PORT=3000
```

**If using MongoDB Atlas**, replace `MONGODB_URI` with the connection string from Atlas:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/room_expense?retryWrites=true&w=majority
```

### 2.3 Start the Server

```powershell
npm start
```

Expected output:
```
Connected to MongoDB
Server listening on port 3000
```

The server is now running at `http://localhost:3000`.

---

## Create Test Users

### Option A: Using PowerShell (REST calls)

**Create an admin user:**
```powershell
$body = @{
    name = "Admin User"
    phone = "7339211768"
    password = "AdminPassword123"
    isAdmin = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/members" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

**Create a regular user:**
```powershell
$body = @{
    name = "John Doe"
    phone = "9876543211"
    password = "JohnsPassword"
    isAdmin = $false
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/members" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

### Option B: Using Postman or Insomnia

1. **POST** to `http://localhost:3000/api/members`
2. Set **Body** → **JSON**:
   ```json
   {
     "name": "Admin User",
     "phone": "7339211768",
     "password": "AdminPassword123",
     "isAdmin": true
   }
   ```
3. **Send**

---

## Test Login

### PowerShell:
```powershell
$body = @{
    phone = "7339211768"
    password = "AdminPassword123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
  -Method Post `
  -Body $body `
  -ContentType "application/json" | ConvertTo-Json
```

**Success response:**
```json
{
  "success": true,
  "member": {
    "id": "...",
    "name": "Admin User",
    "phone": "7339211768",
    "isAdmin": true,
    "addedDate": "2025-11-12T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Configure Angular to Use the Server

The Angular app calls `/api/*` endpoints by default. To route them to your local server:

### 3.1 Create `proxy.conf.json` in `src/`

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "pathRewrite": {
      "^/api": "/api"
    }
  }
}
```

### 3.2 Update `angular.json`

In `projects → room-expense-app → architect → serve → configurations → development`, add:
```json
"proxyConfig": "src/proxy.conf.json"
```

### 3.3 Run Angular Dev Server

```powershell
ng serve
```

Now `http://localhost:4200/api/auth/login` will proxy to `http://localhost:3000/api/auth/login`.

---

## Development Mode (Watch & Auto-Reload)

To run the server with auto-reload on file changes:

```powershell
npm run dev
```

This requires `nodemon` (already in dependencies). It will restart the server whenever you save a file.

---

## MongoDB Troubleshooting

### "Connection refused"
- Is MongoDB running? Check:
  ```powershell
  Get-Process mongod
  ```
- If not, start the service or run `mongod`

### "Authentication failed"
- Check MONGODB_URI and credentials in `.env`
- If using Atlas, ensure your IP is whitelisted

### View Data in MongoDB

Using `mongosh` (or old `mongo`):
```powershell
mongosh
use room_expense
db.members.find()
```

---

## Production Deployment

For production, consider:
1. **MongoDB Atlas** (fully managed cloud DB)
2. **Vercel, Heroku, Railway, or Render** (free Node.js hosting)
3. Set environment variables on the hosting platform
4. Use a strong JWT_SECRET (e.g., 32+ char random string)
5. Enable HTTPS

Example for **Vercel**:
- Push code to GitHub
- Connect repo to Vercel
- Set environment variables in project settings
- Deploy — done!

---

## Stopping the Server

Press `Ctrl+C` in the PowerShell terminal where the server is running.

---

## Summary

| What | Command |
|------|---------|
| **Start MongoDB (local)** | `mongod` or Service start |
| **Start server** | `npm start` (in `server/` folder) |
| **Start server (dev mode)** | `npm run dev` |
| **Create user** | POST `http://localhost:3000/api/members` (JSON body) |
| **Test login** | POST `http://localhost:3000/api/auth/login` (credentials) |
| **Check MongoDB** | `mongosh` and `db.members.find()` |

---

Questions? Feel free to ask!
