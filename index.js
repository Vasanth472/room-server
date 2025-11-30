require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const authRoutes = require('./routes/auth');
const membersRoutes = require('./routes/members');
const categoriesRoutes = require('./routes/categories');
const expensesRoutes = require('./routes/expenses');
const calendarRoutes = require('./routes/calendar');
const settingsRoutes = require('./routes/settings');

const Member = require('./models/Member');
const Setting = require('./models/Setting');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/room_expense';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    seedDefaultMembers();
    seedDefaultSettings();
  })
  .catch(err => console.error('MongoDB connection error', err));

// Seed default test members
async function seedDefaultMembers() {
  try {
    const count = await Member.countDocuments({});
    if (count === 0) {
      console.log('Seeding default members...');
      const adminPassword = await bcrypt.hash('admin123', 10);
      const userPassword = await bcrypt.hash('user123', 10);
      
      await Member.insertMany([
        {
          name: 'Admin User',
          phone: '9000000001',
          passwordHash: adminPassword,
          isAdmin: true,
          isActive: true,
          addedDate: new Date()
        },
        {
          name: 'Test User 1',
          phone: '9000000002',
          passwordHash: userPassword,
          isAdmin: false,
          isActive: true,
          addedDate: new Date()
        },
        {
          name: 'Test User 2',
          phone: '9000000003',
          passwordHash: userPassword,
          isAdmin: false,
          isActive: true,
          addedDate: new Date()
        }
      ]);
      console.log('Default members seeded successfully');
      console.log('Test credentials:');
      console.log('  Admin: phone=9000000001, password=admin123');
      console.log('  User 1: phone=9000000002, password=user123');
      console.log('  User 2: phone=9000000003, password=user123');
    }
  } catch (err) {
    console.error('Error seeding members:', err);
  }
}

// Seed default settings (e.g., fullAmount = 0)
async function seedDefaultSettings() {
  try {
    const existing = await Setting.findOne({ key: 'fullAmount' });
    if (!existing) {
      await Setting.create({ key: 'fullAmount', value: 0 });
      console.log('Seeded default setting: fullAmount = 0');
    }
  } catch (err) {
    console.error('Error seeding settings:', err);
  }
}

app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => res.json({ ok: true }));

const server = app.listen(port, () => console.log(`Server listening on port ${port}`));

// Add a helpful error handler; especially helpful for Node/EADDRINUSE issues
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please stop the process using the port or set PORT environment variable to a free port.`);
    console.error('On Windows, find the PID using: netstat -ano | findstr :<port>');
    console.error('Then kill it: taskkill /PID <pid> /F  OR  Stop-Process -Id <pid> (PowerShell)');
    process.exit(1);
  }
  // rethrow other errors
  throw err;
});

// Log Node version on startup to help diagnose env issues
console.log('Node.js version:', process.version);
const nodeMajor = Number(process.version.replace(/^v/, '').split('.')[0]);
if (isNaN(nodeMajor)) {
  console.warn('Warning: unable to determine Node version major');
} else {
  if (nodeMajor !== 18) {
    console.warn(`Warning: This project targets Node 18.x (see package.json and .nvmrc). Current Node major version is ${nodeMajor}. Using non-LTS Node versions (>= 22 or others) may cause native module incompatibility. Consider using Node 18 for stability.`);
  }
}
