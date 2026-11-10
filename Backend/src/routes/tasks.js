import express from "express";
import { Op } from "sequelize";
import { Task, Contact } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

// GET /api/tasks - fetch all tasks for logged in user
router.get("/", async (req, res) => {
  try {
    const { status, priority, contactId } = req.query;
    const whereClause = { userId: req.user.id };

    if (status && status !== "All") {
      whereClause.status = status;
    }

    if (priority && priority !== "All") {
      whereClause.priority = priority;
    }

    if (contactId) {
      whereClause.contactId = contactId;
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: Contact,
          attributes: ["id", "name", "email", "company", "status"]
        }
      ],
      order: [
        ["status", "ASC"],
        ["dueDate", "ASC"],
        ["id", "DESC"]
      ]
    });

    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks", details: err.message });
  }
});

// POST /api/tasks - create new task
router.post("/", async (req, res) => {
  try {
    const { title, description, dueDate, priority, status, contactId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Task title is required." });
    }

    const task = await Task.create({
      userId: req.user.id,
      contactId: contactId ? parseInt(contactId, 10) : null,
      title: title.trim(),
      description: description ? description.trim() : null,
      dueDate: dueDate || null,
      priority: priority || "Medium",
      status: status || "Pending"
    });

    const populated = await Task.findByPk(task.id, {
      include: [
        {
          model: Contact,
          attributes: ["id", "name", "email", "company", "status"]
        }
      ]
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Failed to create task", details: err.message });
  }
});

// PUT /api/tasks/:id - update existing task
router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    const { title, description, dueDate, priority, status, contactId } = req.body;

    await task.update({
      title: title !== undefined ? title.trim() : task.title,
      description: description !== undefined ? description.trim() : task.description,
      dueDate: dueDate !== undefined ? dueDate : task.dueDate,
      priority: priority !== undefined ? priority : task.priority,
      status: status !== undefined ? status : task.status,
      contactId: contactId !== undefined ? (contactId ? parseInt(contactId, 10) : null) : task.contactId
    });

    const populated = await Task.findByPk(task.id, {
      include: [
        {
          model: Contact,
          attributes: ["id", "name", "email", "company", "status"]
        }
      ]
    });

    res.json(populated);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task", details: err.message });
  }
});

// DELETE /api/tasks/:id - delete task
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    await task.destroy();
    res.json({ message: "Task deleted successfully", id: Number(req.params.id) });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task", details: err.message });
  }
});

export default router;
