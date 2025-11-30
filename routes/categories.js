const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const cats = await Category.find().lean();
    res.json(cats.map(c => ({ 
      id: c._id.toString(), 
      name: c.name, 
      color: c.color, 
      iconUrl: c.iconUrl || '',
      icon: c.icon || '',
      allocatedAmount: c.allocatedAmount || 0, 
      createdBy: c.createdBy, 
      createdDate: c.createdDate 
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/categories/:id
router.get('/:id', async (req, res) => {
  try {
    const c = await Category.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ error: 'Category not found' });
    res.json({ 
      id: c._id.toString(), 
      name: c.name, 
      color: c.color, 
      iconUrl: c.iconUrl || '',
      icon: c.icon || '',
      allocatedAmount: c.allocatedAmount || 0, 
      createdBy: c.createdBy, 
      createdDate: c.createdDate 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  const { name, color, createdBy, allocatedAmount, iconUrl, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const exists = await Category.findOne({ name }).lean();
    if (exists) return res.status(400).json({ error: 'Category already exists' });
    const cat = new Category({ 
      name, 
      color, 
      createdBy, 
      iconUrl: iconUrl || '',
      icon: icon || '',
      allocatedAmount: typeof allocatedAmount === 'number' ? allocatedAmount : 0 
    });
    await cat.save();
    res.json({ 
      id: cat._id.toString(), 
      name: cat.name, 
      color: cat.color, 
      iconUrl: cat.iconUrl || '',
      icon: cat.icon || '',
      allocatedAmount: cat.allocatedAmount || 0, 
      createdBy: cat.createdBy, 
      createdDate: cat.createdDate 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  const { name, color, allocatedAmount, iconUrl, icon } = req.body;
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    if (name) cat.name = name;
    if (color) cat.color = color;
    if (typeof iconUrl !== 'undefined') cat.iconUrl = iconUrl || '';
    if (typeof icon !== 'undefined') cat.icon = icon || '';
    if (typeof allocatedAmount === 'number') cat.allocatedAmount = allocatedAmount;
    await cat.save();
    res.json({ 
      id: cat._id.toString(), 
      name: cat.name, 
      color: cat.color, 
      iconUrl: cat.iconUrl || '',
      icon: cat.icon || '',
      allocatedAmount: cat.allocatedAmount || 0, 
      createdBy: cat.createdBy, 
      createdDate: cat.createdDate 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// GET /api/categories/summary?month=&year= -> per-category totals for the month and remaining budget
router.get('/summary/monthly', async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'month and year required' });
    const m = parseInt(month.toString(), 10);
    const y = parseInt(year.toString(), 10);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    end.setHours(23,59,59,999);

    const Expense = require('../models/Expense');
    const cats = await Category.find().lean();

    const result = [];
    for (const c of cats) {
      const total = await Expense.aggregate([
        { $match: { categoryId: c._id, date: { $gte: start, $lte: end } } },
        { $group: { _id: null, sum: { $sum: '$amount' } } }
      ]);
      const totalExpenses = (total && total[0] && total[0].sum) ? total[0].sum : 0;
      const allocated = typeof c.allocatedAmount === 'number' ? c.allocatedAmount : 0;
      result.push({ id: c._id.toString(), name: c.name, color: c.color, allocatedAmount: allocated, totalExpenses, remaining: allocated - totalExpenses });
    }

    res.json({ month: m, year: y, categories: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
