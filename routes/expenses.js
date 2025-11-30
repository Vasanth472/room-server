const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const { verifyToken } = require('../middleware/auth');
const crypto = require('crypto');

// GET /api/expenses
router.get('/', async (req, res) => {
  // Support optional query params: categoryId, startDate, endDate, month, year
  try {
    const { categoryId, startDate, endDate, month, year } = req.query;
    const query = {};
    if (categoryId) query.categoryId = categoryId;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // include entire end day
      end.setHours(23,59,59,999);
      query.date = { $gte: start, $lte: end };
    }
    if (month && year) {
      const m = parseInt(month.toString(), 10);
      const y = parseInt(year.toString(), 10);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      end.setHours(23,59,59,999);
      query.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(query).lean();
    res.json(expenses.map(e => ({
      id: e._id.toString(),
      amount: e.amount,
      description: e.description,
      date: e.date,
      categoryId: e.categoryId,
      calendarEntryId: e.calendarEntryId,
      categoryName: e.categoryName,
      memberId: e.memberId,
      addedDate: e.addedDate,
      addedBy: e.addedBy,
      comments: e.comments || []
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expenses/summary?month=&year=
router.get('/summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'month and year required' });
    const m = parseInt(month.toString(), 10);
    const y = parseInt(year.toString(), 10);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    end.setHours(23,59,59,999);

    const expenses = await Expense.find({ date: { $gte: start, $lte: end } }).lean();
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    // get active member count
    const Member = require('../models/Member');
    const totalMembers = await Member.countDocuments({ isActive: true });

    const perPersonAmount = totalMembers > 0 ? totalExpenses / totalMembers : totalExpenses;

    res.json({ month: m, year: y, totalExpenses, totalMembers, perPersonAmount, balance: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// COMMENT ROUTES - Must come before /:id route to avoid route conflicts
// POST /api/expenses/:id/comments (authenticated users)
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text required' });
    const comment = {
      id: crypto.randomUUID(),
      authorId: req.user.id,
      authorName: req.user.name || req.user.phone || 'User',
      authorPhone: req.user.phone,
      text,
      timestamp: new Date(),
      date: new Date()
    };
    expense.comments = expense.comments || [];
    expense.comments.push(comment);
    await expense.save();
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/expenses/:id/comments/:commentId (authenticated users - can update own within 5 minutes)
router.put('/:id/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const { commentId } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text required' });
    
    const comment = (expense.comments || []).find(c => c.id === commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    
    // Check if user can edit (own comment only, within 5 minutes)
    const isOwner = comment.authorId === req.user.id;
    if (!isOwner) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }
    
    // Check 5-minute window
    const commentTime = new Date(comment.timestamp);
    const now = new Date();
    const diff = now.getTime() - commentTime.getTime();
    const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
    
    if (diff > EDIT_WINDOW_MS) {
      return res.status(403).json({ error: 'Comment can no longer be edited (5-minute window expired)' });
    }
    
    comment.text = text;
    comment.timestamp = new Date(); // Update timestamp on edit
    await expense.save();
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/expenses/:id/comments/:commentId (authenticated users - can delete own, admin can delete any)
router.delete('/:id/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const { commentId } = req.params;
    const comment = (expense.comments || []).find(c => c.id === commentId);
    
    // Check if user can delete (own comment or admin)
    const isAdmin = req.user.role === 'admin' || req.user.isAdmin;
    const isOwner = comment && comment.authorId === req.user.id;
    
    // For owners, check 5-minute window (unless admin)
    if (isOwner && !isAdmin) {
      const commentTime = new Date(comment.timestamp);
      const now = new Date();
      const diff = now.getTime() - commentTime.getTime();
      const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
      
      if (diff > EDIT_WINDOW_MS) {
        return res.status(403).json({ error: 'Comment can no longer be deleted (5-minute window expired)' });
      }
    }
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }
    
    expense.comments = (expense.comments || []).filter(c => c.id !== commentId);
    await expense.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const e = await Expense.findById(req.params.id).lean();
    if (!e) return res.status(404).json({ error: 'Expense not found' });
    res.json({ 
      id: e._id.toString(), 
      amount: e.amount, 
      description: e.description, 
      date: e.date, 
      categoryId: e.categoryId, 
      calendarEntryId: e.calendarEntryId, 
      categoryName: e.categoryName, 
      memberId: e.memberId, 
      addedDate: e.addedDate,
      addedBy: e.addedBy,
      comments: e.comments || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  const { amount, description, date, categoryId, memberId, addedBy } = req.body;
  if (typeof amount !== 'number' || !date || !categoryId) return res.status(400).json({ error: 'Amount, date and categoryId required' });
  try {
    const cat = await Category.findById(categoryId).lean();
    const categoryName = cat ? cat.name : '';
    const expense = new Expense({ amount, description, date: new Date(date), categoryId, categoryName, memberId, addedBy });
    await expense.save();
    res.json({ id: expense._id.toString(), amount: expense.amount, description: expense.description, date: expense.date, categoryId: expense.categoryId, calendarEntryId: expense.calendarEntryId, categoryName: expense.categoryName, memberId: expense.memberId, addedDate: expense.addedDate, addedBy: expense.addedBy, comments: expense.comments || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const { amount, description, date, categoryId, memberId } = req.body;
    if (typeof amount === 'number') expense.amount = amount;
    if (description !== undefined) expense.description = description;
    if (date) expense.date = new Date(date);
    if (categoryId) {
      expense.categoryId = categoryId;
      const cat = await Category.findById(categoryId).lean();
      expense.categoryName = cat ? cat.name : expense.categoryName;
    }
    if (memberId) expense.memberId = memberId;
    await expense.save();
    res.json({ id: expense._id.toString(), amount: expense.amount, description: expense.description, date: expense.date, categoryId: expense.categoryId, calendarEntryId: expense.calendarEntryId, categoryName: expense.categoryName, memberId: expense.memberId, addedDate: expense.addedDate, addedBy: expense.addedBy, comments: expense.comments || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
