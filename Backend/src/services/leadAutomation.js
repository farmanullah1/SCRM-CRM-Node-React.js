import { Lead, Role, User, Op } from "../db.js";
import { createNotification } from "../routes/notifications.js";

/**
 * Deterministic lead score from persisted lead data. No hidden/fake signals:
 * every point comes from a field or timestamp stored on the lead.
 */
export function calculateLeadScore(lead) {
  const plain = lead?.toJSON ? lead.toJSON() : lead || {};
  let score = 0;
  const source = String(plain.source || "").toLowerCase();
  const notes = String(plain.notes || "").toLowerCase();

  if (source.includes("referral")) score += 20;
  if (source.includes("web") || source.includes("landing") || source.includes("form")) score += 10;
  if (source.includes("email")) score += 8;
  if (notes.includes("pricing")) score += 10;
  if (notes.includes("demo")) score += 15;
  if (notes.includes("brochure")) score += 10;
  if (Number(plain.estimated_value || 0) >= 10000) score += 20;
  else if (Number(plain.estimated_value || 0) > 0) score += 5;
  if (String(plain.status || "") === "Qualified") score += 15;
  else if (String(plain.status || "") === "Contacted") score += 5;
  if (plain.last_activity_at) {
    const inactiveDays = (Date.now() - new Date(plain.last_activity_at).getTime()) / 86400000;
    if (inactiveDays > 30) score -= 5;
  }

  return Math.max(0, score);
}

/**
 * Round-robin across active sales-capable users, choosing the rep with the
 * fewest currently owned leads. This is a real assignment, not a simulated one.
 */
export async function assignLeadRoundRobin(lead) {
  const roles = await Role.findAll({ where: { role_name: { [Op.in]: ["standard_user", "manager"] } } });
  const roleIds = roles.map((role) => role.id);
  if (roleIds.length === 0) return null;

  const reps = await User.findAll({
    where: { is_active: true, role_id: { [Op.in]: roleIds } },
    attributes: ["id", "name", "email"],
    order: [["id", "ASC"]]
  });
  if (reps.length === 0) return null;

  const counts = await Promise.all(reps.map(async (rep) => ({
    rep,
    count: await Lead.count({ where: { owner_id: rep.id } })
  })));
  counts.sort((a, b) => a.count - b.count || a.rep.id - b.rep.id);
  const chosen = counts[0].rep;

  lead.owner_id = chosen.id;
  await lead.save();
  await createNotification({
    userId: chosen.id,
    type: "lead_assigned",
    title: "New lead assigned",
    body: `${lead.name}${lead.company_name ? ` · ${lead.company_name}` : ""}`,
    link: "/app/leads"
  });
  return chosen;
}

export async function runLeadAutomation(lead, { assign = false } = {}) {
  lead.score = calculateLeadScore(lead);
  lead.last_activity_at = lead.last_activity_at || new Date();
  await lead.save();
  if (assign && !lead.owner_id) await assignLeadRoundRobin(lead);
  return lead;
}
