import express from 'express';
import { db } from '../db/db.js';
import { requireAuth, requireTherapist } from '../middleware/auth.middleware.js';

const router = express.Router();


// Get tasks for a client
router.get('/', requireAuth, requireTherapist, (req, res) => {
  const { clientId, therapistId } = req.query;
  const tasksCollection = db.collection('tasks');

  const filter = {};
  if (clientId) filter.clientId = clientId;
  if (therapistId) filter.therapistId = therapistId;

  const tasks = tasksCollection.find(filter);
  res.json(tasks);
});

// Create task for client (Therapist only)
router.post('/', requireAuth, requireTherapist, (req, res) => {
  const { clientId, therapistId, title, description, category, dueDate } = req.body;

  if (!clientId || !title) {
    return res.status(400).json({ error: 'מזהה לקוח וכותרת משימה הינם שדות חובה' });
  }

  const tasks = db.collection('tasks');
  const newTask = tasks.insertOne({
    clientId,
    therapistId: therapistId || null,
    title: title.trim(),
    description: description ? description.trim() : '',
    category: category || 'תרגול ביתי',
    dueDate: dueDate || null,
    completed: false,
    completedAt: null,
    clientNotes: ''
  });

  res.status(201).json(newTask);
});

// Update task (Therapist)
router.put('/:id', requireAuth, requireTherapist, (req, res) => {
  const { id } = req.params;
  const tasks = db.collection('tasks');

  const existing = tasks.findById(id);
  if (!existing) {
    return res.status(404).json({ error: 'משימה לא נמצאה' });
  }

  const allowedFields = ['title', 'description', 'category', 'dueDate', 'completed', 'clientNotes'];
  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  if (req.body.completed !== undefined) {
    updateData.completedAt = req.body.completed ? new Date().toISOString() : null;
  }

  const updated = tasks.updateById(id, updateData);
  res.json(updated);
});

// Delete task (Therapist only)
router.delete('/:id', requireAuth, requireTherapist, (req, res) => {
  const { id } = req.params;
  const tasks = db.collection('tasks');

  const success = tasks.deleteById(id);
  if (!success) {
    return res.status(404).json({ error: 'משימה לא נמצאה למחיקה' });
  }

  res.json({ message: 'משימה נמחקה בהצלחה' });
});

export default router;
