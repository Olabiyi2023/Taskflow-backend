# TaskFlow Operations API Documentation

**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Host Environment:** Port 3000 (Express.js + Vite Reverse Proxy)  
**Supported Email Providers:** Resend API & SendGrid API (with Simulation Engine fallback)  
**Database:** Supabase PostgreSQL with In-Memory fallback store

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Authentication & Headers](#authentication--headers)
3. [Email Notifications Engine (Resend & SendGrid)](#email-notifications-engine)
4. [Task Management Endpoints](#task-management-endpoints)
5. [Task Comments & Attachments](#task-comments--attachments)
6. [Team Coordination](#team-coordination)
7. [Notifications & Alert Preferences](#notifications--alert-preferences)
8. [Billing & Paystack Integration](#billing--paystack-integration)
9. [System & Background Cron Scanners](#system--background-cron-scanners)
10. [Environment Variables](#environment-variables)

---

## 1. Overview & Architecture

TaskFlow is an enterprise-grade task operations hub designed for high-velocity teams. The backend implements:
- **Resend & SendGrid Automated Alerting:** Dispatches branded HTML transactional email alerts upon task assignment/reassignment and scheduled deadline approaches (24-hour advance warning) and overdue escalations.
- **Supabase PostgreSQL Persistence:** Auto-syncs workspaces, tasks, team directories, and notifications to Supabase with automated fallback to an in-memory store if connection strings are not configured.
- **Paystack Subscription Billing:** Manages recurring monthly/annual plans and 7-day trials for regional billing.
- **Multi-Role JWT Auth:** Role-based access control (`Business Owner`, `Team Lead`, `Developer`, `Operations Specialist`, etc.).

---

## 2. Authentication & Headers

All protected endpoints require an `Authorization` header containing the user's JWT bearer token:

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

---

## 3. Email Notifications Engine

TaskFlow wires up **Resend** or **SendGrid** to dispatch transactional email alerts across team task lifecycles.

### Email Triggers & Events
| Event | Trigger | Recipient | Email Template |
|---|---|---|---|
| **Task Assignment** | Task creation or `assigned_to` update | Assigned Team Member | Branded HTML task card with priority badge, due date, and deep-link |
| **Approaching Deadline** | Cron scanner detects task due in 24 hours | Assignee (or creator) | Branded "Due Tomorrow" reminder with priority & CTA button |
| **Overdue Escalation** | Cron scanner detects past-due active task | Assignee (or creator) | High-visibility overdue alert with status update CTA |
| **Manual Test Dispatch** | Triggered via UI / API test endpoint | Any specified email address | Interactive verification email confirming pipeline health |

### Email Endpoints

#### 3.1 Get Email Pipeline Configuration
- **Method:** `GET`
- **Path:** `/api/v1/notifications/email-config`
- **Auth:** Required
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "configured": true,
      "activeProvider": "resend",
      "hasResendKey": true,
      "hasSendGridKey": false,
      "fromEmail": "TaskFlow <onboarding@resend.dev>",
      "appUrl": "http://localhost:3000"
    }
  }
  ```

#### 3.2 Get Outgoing Email Audit Logs
- **Method:** `GET`
- **Path:** `/api/v1/notifications/email-logs`
- **Auth:** Required
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "eml_1726050000_a1b2c3",
        "timestamp": "2026-09-11T10:00:00.000Z",
        "type": "task_assigned",
        "to": "dev@acmewestafrica.com",
        "subject": "[TaskFlow] Assigned to Task: Set Up Multi-AZ Failover (High Priority)",
        "provider": "resend",
        "status": "delivered",
        "taskId": "task-default-1"
      }
    ]
  }
  ```

#### 3.3 Send Test Email Alert
- **Method:** `POST`
- **Path:** `/api/v1/notifications/test-email`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "type": "task_assigned"
  }
  ```
  *Allowed `type` values:* `'task_assigned'`, `'deadline_approaching'`, `'task_overdue'`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "provider": "resend",
      "id": "msg_abc123",
      "message": "Email successfully delivered via Resend to user@example.com"
    },
    "message": "Email successfully delivered via Resend to user@example.com"
  }
  ```

#### 3.4 Trigger Deadline Email Alert Scanners
- **Method:** `POST`
- **Path:** `/api/v1/notifications/trigger-deadline-alerts`
- **Auth:** Required
- **Description:** Instantly runs both the 24-hour upcoming deadline scanner and overdue task scanner, generating in-app notifications and email alerts.
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "overdue": {
        "task": "overdue_scanner",
        "scannedAt": "2026-09-11T10:05:00.000Z",
        "triggeredCount": 2
      },
      "approaching": {
        "task": "approaching_deadlines",
        "scannedAt": "2026-09-11T10:05:00.000Z",
        "triggeredCount": 1
      }
    },
    "message": "Scanned tasks: 1 upcoming deadline alerts, 2 overdue alerts generated."
  }
  ```

---

## 4. Task Management Endpoints

### 4.1 List Tasks
- **Method:** `GET`
- **Path:** `/api/v1/tasks`
- **Auth:** Required
- **Query Parameters:**
  - `search`: Filter by text in title or description
  - `status`: `Pending`, `In Progress`, `Completed`, or `All`
  - `priority`: `Low`, `Medium`, `High`, `Urgent`, or `All`
  - `assigned_to`: Team member UUID
  - `is_overdue`: `true` or `false`
  - `page`: Page index (default: `1`)
  - `limit`: Items per page (default: `50`)

### 4.2 Create Task
- **Method:** `POST`
- **Path:** `/api/v1/tasks`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "title": "Migrate Database to Supabase Production Tier",
    "description": "Run schema DDL and verify foreign key indexes",
    "priority": "High",
    "status": "Pending",
    "due_date": "2026-09-20",
    "assigned_to": "member-uuid-here"
  }
  ```
  *Note: If `assigned_to` is specified, an immediate task assignment email alert is dispatched to that team member.*

### 4.3 Update Task
- **Method:** `PUT`
- **Path:** `/api/v1/tasks/:id`
- **Auth:** Required
- **Description:** Updates task fields. If `assigned_to` changes, a reassignment email alert is dispatched to the new assignee.

### 4.4 Update Task Status
- **Method:** `PATCH`
- **Path:** `/api/v1/tasks/:id/status`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "status": "In Progress"
  }
  ```

### 4.5 Delete Task
- **Method:** `DELETE`
- **Path:** `/api/v1/tasks/:id`
- **Auth:** Required

---

## 5. Task Comments & Attachments

### 5.1 List Comments
- **Method:** `GET`
- **Path:** `/api/v1/tasks/:id/comments`

### 5.2 Add Comment
- **Method:** `POST`
- **Path:** `/api/v1/tasks/:id/comments`
- **Request Body:** `{ "content": "Database backup verified successfully." }`

### 5.3 List Attachments
- **Method:** `GET`
- **Path:** `/api/v1/tasks/:id/attachments`

### 5.4 Upload Attachment (Supabase Storage)
- **Method:** `POST`
- **Path:** `/api/v1/tasks/:id/attachments`
- **Request Body:**
  ```json
  {
    "file_name": "architecture_diagram.png",
    "file_type": "image/png",
    "file_size": 128000,
    "file_base64": "data:image/png;base64,iVBORw0KGgo..."
  }
  ```

---

## 6. Team Coordination

### 6.1 List Team Members
- **Method:** `GET`
- **Path:** `/api/v1/team`

### 6.2 Add Team Member
- **Method:** `POST`
- **Path:** `/api/v1/team`
- **Request Body:**
  ```json
  {
    "name": "Chidi Okafor",
    "email": "chidi.okafor@acmewestafrica.com",
    "role": "Developer",
    "department": "Infrastructure"
  }
  ```

---

## 7. Notifications & Alert Preferences

### 7.1 List In-App Notifications
- **Method:** `GET`
- **Path:** `/api/v1/notifications`

### 7.2 Get Unread Count
- **Method:** `GET`
- **Path:** `/api/v1/notifications/unread-count`

### 7.3 Mark as Read
- **Method:** `PATCH`
- **Path:** `/api/v1/notifications/:id/read`

### 7.4 Mark All as Read
- **Method:** `PATCH`
- **Path:** `/api/v1/notifications/mark-all-read`

### 7.5 Get User Alert Preferences
- **Method:** `GET`
- **Path:** `/api/v1/notifications/preferences`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user_id": "usr_sarah_adebayo",
      "task_assignments": true,
      "comments": true,
      "status_changes": true,
      "upcoming_deadlines": true,
      "overdue_tasks": true,
      "updated_at": "2026-09-11T03:00:00.000Z"
    }
  }
  ```

### 7.6 Update User Alert Preferences
- **Method:** `PATCH`
- **Path:** `/api/v1/notifications/preferences`
- **Request Body:**
  ```json
  {
    "task_assignments": true,
    "upcoming_deadlines": true,
    "overdue_tasks": true
  }
  ```

---

## 8. Billing & Paystack Integration

### 8.1 Get Billing Config
- **Method:** `GET`
- **Path:** `/api/v1/billing/config`

### 8.2 Get Subscription Status
- **Method:** `GET`
- **Path:** `/api/v1/billing/subscription`

### 8.3 Initialize Paystack Checkout
- **Method:** `POST`
- **Path:** `/api/v1/billing/paystack/initialize`
- **Request Body:**
  ```json
  {
    "amount": 12500,
    "plan": "monthly"
  }
  ```

### 8.4 Verify Paystack Transaction
- **Method:** `POST`
- **Path:** `/api/v1/billing/paystack/verify`
- **Request Body:**
  ```json
  {
    "reference": "TFX_1726050000_123"
  }
  ```

---

## 9. System & Background Cron Scanners

### 9.1 Run All Scanners
- **Method:** `POST`
- **Path:** `/api/v1/system/cron/run-scanners`
- **Description:** Runs the overdue task scanner, approaching deadlines scanner, and subscription trial expiration engine.

### 9.2 Supabase Connection Status
- **Method:** `GET`
- **Path:** `/api/v1/system/supabase-status`

### 9.3 Supabase DDL Schema
- **Method:** `GET`
- **Path:** `/api/v1/system/supabase-schema`

---

## 10. Environment Variables

Define these variables in your environment or Settings panel:

```env
# Email Notifications (Resend or SendGrid)
RESEND_API_KEY="re_123456789abcdef"
RESEND_FROM_EMAIL="TaskFlow <onboarding@resend.dev>"

# Alternative: SendGrid
SENDGRID_API_KEY=""
SENDGRID_FROM_EMAIL="TaskFlow Alerts <alerts@taskflow.dev>"

# Supabase PostgreSQL
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."

# Paystack Billing
PAYSTACK_PUBLIC_KEY="pk_test_..."
PAYSTACK_SECRET_KEY="sk_test_..."

# Authentication & Application
JWT_SECRET="taskflow-production-jwt-secret-key-at-least-32-chars"
APP_URL="http://localhost:3000"
```
