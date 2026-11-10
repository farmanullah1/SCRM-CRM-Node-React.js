import express from "express";
import { Op } from "sequelize";
import { Task, Contact, User, Deal } from "../db.js";
import { authenticateToken, logAudit } from "../middleware/auth.js";
import { sanitizeString } from "../middleware/security.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/tasks - fetch tasks with filters, overdue status, assignment
router.get("/", async (req, res) => {
  try {
    const { status, priority, contactId, dealId, assignedTo, overdue } = req.query;
    const whereClause = {};

    // Standard user restriction: view assigned or created tasks
    if (req.user.role === "standard_user" && !req.user.permissions?.view_all) {
      whereClause[Op.or] = [
        { userId: req.user.id },
        { assigned_to_user_id: req.user.id }
      ];
    }

    if (status && status !== "All") {
      whereClause.status = status;
    }

    if (priority && priority !== "All") {
      whereClause.priority = priority;
    }

    if (contactId) {
      whereClause[Op.or] = [
        { contactId },
        { related_contact_id: contactId }
      ];
    }

    if (dealId) {
      whereClause.related_deal_id = dealId;
    }

    if (assignedTo) {
      whereClause.assigned_to_user_id = assignedTo;
    }

    if (overdue === "true") {
      whereClause.dueDate = { [Op.lt]: new Date() };
      whereClause.status = { [Op.ne]: "Completed" };
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: Contact,
          attributes: ["id", "name", "email", "company", "status"]
        },
        {
          model: User,
          attributes: ["id", "name", "email"]
        }
      ],
      order: [
        ["status", "ASC"],
        ["dueDate", "ASC"],
        ["id", "DESC"]
      ]
    });

    // Calculate summary statistics
    const now = new Date();
    let overdueCount = 0;
    let dueTodayCount = 0;
    let pendingCount = 0;

    tasks.forEach((t) => {
      if (t.status !== "Completed") {
        pendingCount++;
        if (t.dueDate) {
          const d = new Date(t.dueDate);
          if (d < now) overdueCount++;
          else if (d.toDateString() === now.toDateString()) dueTodayCount++;
        }
      }
    });

    res.json({ tasks, stats: { total: tasks.length, overdue: overdueCount, dueToday: dueTodayCount, pending: pendingCount } });
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks", details: err.message });
  }
});

// POST /api/tasks - create new task
router.post("/", async (req, res) => {
  try {
    let { title, description, dueDate, priority, status, contactId, dealId, assignedToUserId } = req.body;

    title = sanitizeString(title);
    description = sanitizeString(description);

    if (!title) {
      return res.status(400).json({ error: "Task title is required." });
    }

    const targetContact = contactId ? parseInt(contactId, 10) : null;
    const targetDeal = dealId ? parseInt(dealId, 10) : null;
    const assignedUser = assignedToUserId ? parseInt(assignedToUserId, 10) : req.user.id;

    const task = await Task.create({
      userId: req.user.id,
      assigned_to_user_id: assignedUser,
      contactId: targetContact,
      related_contact_id: targetContact,
      related_deal_id: targetDeal,
      title,
      description: description || null,
      dueDate: dueDate || null,
      due_date: dueDate || null,
      priority: priority || "Medium",
      status: status || "Pending"
    });

    await logAudit(req.user.id, "CREATE_TASK", "Task", task.id, {
      title,
      contactId: targetContact,
      assignedTo: assignedUser
    });

    const populated = await Task.findByPk(task.id, {
      include: [
        { model: Contact, attributes: ["id", "name", "email", "company", "status"] },
        { model: User, attributes: ["id", "name", "email"] }
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
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    let { title, description, dueDate, priority, status, contactId, dealId, assignedToUserId } = req.body;
    const oldStatus = task.status;

    if (title !== undefined) task.title = sanitizeString(title);
    if (description !== undefined) task.description = sanitizeString(description);
    if (dueDate !== undefined) {
      task.dueDate = dueDate;
      task.due_date = dueDate;
    }
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (contactId !== undefined) {
      task.contactId = contactId;
      task.related_contact_id = contactId;
    }
    if (dealId !== undefined) task.related_deal_id = dealId;
    if (assignedToUserId !== undefined) task.assigned_to_user_id = assignedToUserId;

    await task.save();

    if (status && status !== oldStatus && status === "Completed") {
      await logAudit(req.user.id, "TASK_COMPLETED", "Task", task.id, { title: task.title });
    }

    const populated = await Task.findByPk(task.id, {
      include: [
        { model: Contact, attributes: ["id", "name", "email", "company", "status"] },
        { model: User, attributes: ["id", "name", "email"] }
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
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    await task.destroy();
    await logAudit(req.user.id, "DELETE_TASK", "Task", req.params.id, { title: task.title });

    res.json({ message: "Task deleted successfully", id: parseInt(req.params.id, 10) });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task", details: err.message });
  }
});

export default router;
