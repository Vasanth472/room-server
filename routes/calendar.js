const express = require('express');
const router = express.Router();
const CalendarEntry = require('../models/CalendarEntry');
const Expense = require('../models/Expense');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const crypto = require('crypto');

// GET /api/calendar
router.get('/', async (req, res) => {
  try {
    const entries = await CalendarEntry.find().lean();
    res.json(entries.map(e => ({
      id: e._id.toString(),
      title: e.title,
      description: e.description,
      date: e.date,
      categoryId: e.categoryId,
      categoryName: e.categoryName,
      price: e.price,
      createdBy: e.createdBy,
      addedDate: e.addedDate,
      comments: e.comments || []
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/calendar/:id
router.get('/:id', async (req, res) => {
  try {
    const e = await CalendarEntry.findById(req.params.id).lean();
    if (!e) return res.status(404).json({ error: 'Entry not found' });
    res.json({
      id: e._id.toString(),
      title: e.title,
      description: e.description,
      date: e.date,
      categoryId: e.categoryId,
      categoryName: e.categoryName,
      price: e.price,
      createdBy: e.createdBy,
      addedDate: e.addedDate,
      comments: e.comments || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/calendar (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { title, description, date, categoryId, categoryName, price, createdBy } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Title and date required' });
  try {
    const entry = new CalendarEntry({ title, description, date: new Date(date), categoryId, categoryName, price: price || 0, createdBy });
    await entry.save();
    // If price > 0 and categoryId set, create a corresponding Expense record so calendar entries reflect in monthly expenses
    if (entry.price && entry.price > 0 && entry.categoryId) {
      try {
        const expense = new Expense({ amount: entry.price, description: entry.description || entry.title, date: entry.date, categoryId: entry.categoryId, categoryName: entry.categoryName, memberId: entry.createdBy, calendarEntryId: entry._id });
        await expense.save();
      } catch (e) {
        console.error('Failed to create expense from calendar entry:', e);
      }
    }
    res.json({ id: entry._id.toString(), title: entry.title, description: entry.description, date: entry.date, categoryId: entry.categoryId, categoryName: entry.categoryName, price: entry.price, createdBy: entry.createdBy, addedDate: entry.addedDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/calendar/:id (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const entry = await CalendarEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    const { title, description, date, categoryId, price } = req.body;
    if (title) entry.title = title;
    if (description !== undefined) entry.description = description;
    if (date) entry.date = new Date(date);
    if (categoryId) entry.categoryId = categoryId;
    if (typeof price === 'number') entry.price = price;
    await entry.save();
    // Keep associated expense in sync if present (find by calendarEntryId)
    try {
      const existing = await Expense.findOne({ calendarEntryId: entry._id });
      if (existing) {
        existing.amount = entry.price || 0;
        existing.description = entry.description || entry.title || existing.description;
        existing.date = entry.date;
        existing.categoryId = entry.categoryId || existing.categoryId;
        existing.categoryName = entry.categoryName || existing.categoryName;
        await existing.save();
      } else if (entry.price && entry.price > 0 && entry.categoryId) {
        // create an expense if it didn't exist and price > 0
        const expense = new Expense({ amount: entry.price, description: entry.description || entry.title, date: entry.date, categoryId: entry.categoryId, categoryName: entry.categoryName, memberId: entry.createdBy, calendarEntryId: entry._id });
        await expense.save();
      }
    } catch (e) {
      console.error('Failed to sync expense for calendar entry:', e);
    }
    res.json({ id: entry._id.toString(), title: entry.title, description: entry.description, date: entry.date, categoryId: entry.categoryId, categoryName: entry.categoryName, price: entry.price, createdBy: entry.createdBy, addedDate: entry.addedDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/calendar/:id (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const entry = await CalendarEntry.findByIdAndDelete(req.params.id);
    // remove linked expense if any
    try {
      await Expense.deleteMany({ calendarEntryId: req.params.id });
    } catch (e) {
      console.error('Failed to delete linked expenses for calendar entry:', e);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Note: per request, last-update tracking removed (no /:id/touch endpoint)

// COMMENTS: POST /api/calendar/:id/comments (authenticated users)
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const entry = await CalendarEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text required' });
    const comment = {
      id: crypto.randomUUID(),
      authorId: req.user.id,
      authorName: req.user.name || req.user.phone || 'User',
      authorPhone: req.user.phone,
      text,
      addedDate: new Date(),
      replies: []
    };
    entry.comments = entry.comments || [];
    entry.comments.push(comment);
    await entry.save();
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/calendar/:id/comments/:commentId/reply (admin only)
router.post('/:id/comments/:commentId/reply', verifyToken, requireAdmin, async (req, res) => {
  try {
    const entry = await CalendarEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    const { commentId } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Reply text required' });
    const comment = (entry.comments || []).find(c => c.id === commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const reply = { id: crypto.randomUUID(), adminId: req.user.id, adminName: req.user.name || req.user.phone || 'Admin', text, addedDate: new Date() };
    comment.replies = comment.replies || [];
    comment.replies.push(reply);
    await entry.save();
    res.json(reply);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/calendar/:id/comments/:commentId (admin only)
router.delete('/:id/comments/:commentId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const entry = await CalendarEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    const { commentId } = req.params;
    entry.comments = (entry.comments || []).filter(c => c.id !== commentId);
    await entry.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
