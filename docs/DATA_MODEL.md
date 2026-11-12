# SCRM Data Model

> Source of truth: `Backend/src/db.js` and the idempotent schema checks in `Backend/src/dbSetup.js`. Last verified: 2026-11-12.

## Core identity and access

| Table | Key fields | Notes |
|---|---|---|
| `users` | `id`, `name`, `email` (unique), `password`, `role`, `role_id`, `token_version`, `is_active`, `phone`, `company_name`, `title`, `avatar_url`, `cover_url`, `bio`, `department`, `country`, `timezone`, `language` | `password` is a bcrypt hash. `permission_overrides_json` stores per-user grants/revocations. TOTP fields: `two_factor_enabled`, `two_factor_secret`, `two_factor_pending_secret`, `recovery_codes_json`, `two_factor_attempts`. Reset fields: `reset_password_token`, `reset_password_expires`. |
| `roles` | `id`, `role_name` (unique), `display_name`, `description`, `is_system`, `permissions_json` | System templates plus cloned custom roles. |
| `organizations` | `id`, `name`, `domain` | Present, but not referenced by operational tables. |
| `organization_members` | `organization_id`, `user_id`, `role` | Present; no enforced tenant scope on business queries. |

## CRM records

| Table | Key fields | Relationships |
|---|---|---|
| `leads` | `id`, `name`, `email`, `phone`, `company_name`, `source`, `status`, `estimated_value`, `score`, `owner_id`, `converted_contact_id`, `converted_deal_id` | `owner_id → users.id`. Converted lead links to the created contact/deal. |
| `companies` | `id`, `name`, `domain`, `phone`, `address` | Has many contacts, invoices, and tickets. |
| `contacts` | `id`, `userId`, `owner_id`, `name`, `email`, `phone`, `company`, `company_id`, `status`, `value`, `leadSource`, `tags`, `notes`, `expectedCloseDate` | `company_id → companies.id`; `userId → users.id`; has many deals, tasks, invoices, and tickets. |
| `leads_deals` | `id`, `title`, `value`, `stage_id`, `stage_name`, `expected_close_date`, `owner_id`, `contact_id`, `notes` | Despite the table name, this is the deal table. `contact_id → contacts.id`; `owner_id → users.id`. |
| `pipeline_stages` | `id`, `name` (unique), `order_index` | Seeded stage order. Deals also store `stage_name` for compatibility. |
| `tasks` | `id`, `userId`, `assigned_to_user_id`, `contactId`, `related_contact_id`, `related_deal_id`, `title`, `description`, `dueDate`, `due_date`, `priority`, `status` | Linked to users, contacts, and deals. |
| `activity_logs` | `id`, `user_id`, `action`, `target_type`, `target_id`, `timestamp`, `details_json` | Audit/activity stream used by the UI and audit export. |
| `saved_views` | `id`, `userId`, `name`, `entity`, `query_json`, `is_shared` | Per-user saved filters; optional sharing flag. |

## Commerce

| Table | Key fields | Relationships |
|---|---|---|
| `invoices` | `id`, `userId`, `contactId`, `companyId`, `invoiceNumber`, `type`, `amount`, `status`, `dueDate`, `items`, `subtotal`, `tax_rate`, `tax_amount`, `amount_paid`, `credit_amount`, `notes`, `issued_date`, `paid_at` | `contactId → contacts.id`; `companyId → companies.id`; `userId → users.id`. `items` is JSON text. |
| `invoice_payments` | `id`, `invoiceId`, `userId`, `kind` (`Payment`/`Credit`), `amount`, `method`, `reference`, `note`, `paid_at` | `invoiceId → invoices.id` with cascade delete. |
| `products` | `id`, `name`, `sku`, `description`, `price`, `cost`, `unit`, `category`, `is_active` | Catalog items used by invoice line items. |
| `suppliers` | `id`, `name`, `contact_name`, `email`, `phone`, `category`, `notes` | Vendor directory. |

## Communication and support

| Table | Key fields | Relationships |
|---|---|---|
| `email_logs` | `id`, `user_id`, `contact_id`, `template_name`, `recipient_email`, `subject`, `body`, `tracking_pixel_id`, `thread_id`, `in_reply_to`, `direction`, `is_opened`, `opened_at`, `status` | Threads are grouped by `thread_id`; `in_reply_to` stores the parent message ID when supplied. |
| `tickets` | `id`, `userId`, `contactId`, `companyId`, `ticketNumber`, `subject`, `description`, `priority`, `status` | Links to contact, company, and creator. |
| `notifications` | `id`, `userId`, `type`, `title`, `body`, `link`, `is_read` | Per-user in-app notifications; cascades on user delete. |
| `whatsapp_messages` | `id`, `user_id`, `contact_id`, `direction`, `phone`, `chat_id`, `body`, `message_type`, `media_mimetype`, `media_filename`, `status`, `external_id`, `error_message` | Local log for the WhatsApp Web adapter. |

## Files and developer platform

| Table | Key fields | Notes |
|---|---|---|
| `file_attachments` | `id`, `entity_type`, `entity_id`, `file_name`, `file_path`, `file_type`, `file_size`, `uploaded_by`, `uploaded_at` | Polymorphic link by `entity_type` + `entity_id`. `uploaded_at` has no Sequelize timestamps. |
| `api_keys` | `id`, `user_id`, `name`, `key_prefix`, `key_hash`, `permissions_json`, `last_used_at`, `expires_at` | Only the hash is stored; plaintext is shown once. |
| `web_leads` | `id`, `form_id`, `name`, `email`, `phone`, `message`, `ip_address`, `is_processed` | Raw public web-form submissions used by the lead-capture flow. |
| `comments` | `id`, `entity_type`, `entity_id`, `user_id`, `user_name`, `content` | Polymorphic comments. |

## Deletion and integrity notes

- `User → Contact`, `User → Task`, `User → Invoice`, `User → SavedView`, `User → Notification`, and `User → Ticket` are declared with cascade delete. Other relations are application-managed.
- `Invoice → InvoicePayment` cascades.
- Deleting a contact does not delete its deals, tasks, invoices, or tickets; those rows may retain the old `contact_id` unless the route clears or reassigns it.
- `activity_logs` is append-oriented. Destructive operations should add an audit row rather than erase history.

## Current tenancy limitation

No operational table has an `organization_id`. Adding one is a schema migration, not a documentation change. Until it exists, treat all records as belonging to the single workspace and rely on ownership/scope permissions.
