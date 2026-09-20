# Approval Request Management System

A complete, full-stack Approval Request Management Application built with **Node.js + Express** (backend) and **Angular 19** (frontend), utilizing strictly in-memory storage and standard REST APIs.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture & Project Structure](#architecture--project-structure)
4. [Business Rules & Lifecycle State Machine](#business-rules--lifecycle-state-machine)
5. [REST API Documentation](#rest-api-documentation)
6. [Installation & Setup](#installation--setup)
7. [Running the Application](#running-the-application)
8. [Automated Testing](#automated-testing)

---

## Project Overview

The Approval Request Management Application enables employees and reviewers to handle internal purchase/budget approval workflows with strict server-side validation and state machine constraints.

### Core Capabilities:
- **Create Approval Requests**: Provide a title, requester name, and multiple line items (description, quantity, price).
- **Automated Grand Total Calculations**: Line totals and grand totals are calculated securely on the server (`quantity × price`, sum of line totals).
- **Lifecycle Management**: Strict transition from `Editable` → `Submitted` → `Approved` or `Rejected`.
- **Locking on Submission**: Once submitted, requests are locked and cannot be edited.
- **Reviewer Actions**: Approve or reject submitted requests with confirmation dialogs.
- **Search & Filtering**: Search requests by title, filter by status, with clean pagination controls.
- **Error Handling & Feedback**: Centralized HTTP error handling, friendly user notifications, and loading indicators.

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Angular 19 (TypeScript, Standalone Components, Reactive UI)
- **Data Storage**: In-memory store (`requests = []`), no external database
- **API Style**: RESTful JSON APIs with CORS support
- **Testing**: Jest & Supertest for backend business logic and API testing

---

## Architecture & Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── requestController.js    # Express route handlers
│   │   ├── routes/
│   │   │   └── requestRoutes.js        # REST endpoint mapping
│   │   ├── services/
│   │   │   └── requestService.js       # Core business logic & state machine
│   │   ├── models/
│   │   │   └── requestModel.js         # Domain constants and status enums
│   │   ├── middleware/
│   │   │   ├── errorHandler.js         # Global error and 404 handling
│   │   │   └── validation.js           # Request payload validations
│   │   ├── utils/
│   │   │   ├── idGenerator.js          # Sequential REQ-XXX / LI-X generator
│   │   │   └── calculations.js         # Safe numeric financial math
│   │   ├── data/
│   │   │   └── store.js                # In-memory storage layer
│   │   └── server.js                   # App setup and CORS configuration
│   ├── tests/
│   │   └── requests.test.js            # 29 automated test cases
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── models/
│   │   │   │   └── request.model.ts    # TypeScript interfaces and types
│   │   │   ├── services/
│   │   │   │   └── request.service.ts  # HTTP client service and error handling
│   │   │   ├── components/
│   │   │   │   ├── request-list/       # List, search, filter, pagination
│   │   │   │   ├── request-form/       # Create & edit requests with live calculations
│   │   │   │   ├── request-detail/     # Details view and lifecycle action buttons
│   │   │   │   └── confirmation-modal/ # Reusable confirmation dialog
│   │   │   ├── app.routes.ts           # Angular route configurations
│   │   │   ├── app.component.ts        # Shell layout and top navigation
│   │   │   └── app.config.ts           # Application providers (HttpClient, Router)
│   │   ├── environments/
│   │   │   └── environment.ts          # Configurable API base URL
│   │   ├── index.html
│   │   └── styles.css                  # Global design system
│   ├── angular.json
│   └── package.json
│
└── README.md
```

---

## Business Rules & Lifecycle State Machine

### 1. Request Lifecycle

```
Editable ──(submit)──> Submitted ──(approve)──> Approved
                                 └──(reject)───> Rejected
```

**Allowed Transitions:**
- `Editable` → `Submitted` (via `POST /api/requests/:id/submit`)
- `Submitted` → `Approved` (via `POST /api/requests/:id/approve`)
- `Submitted` → `Rejected` (via `POST /api/requests/:id/reject`)

**Strictly Forbidden Transitions (HTTP 409 Conflict):**
- `Editable` → `Approved` ❌
- `Editable` → `Rejected` ❌
- `Submitted` → `Submitted` ❌
- `Approved` → `Rejected` ❌
- `Approved` → `Approved` ❌
- `Rejected` → `Approved` ❌
- `Rejected` → `Rejected` ❌
- `Rejected` → `Submitted` ❌

### 2. Editing Rules
- Only requests in `Editable` status can be updated.
- Once submitted, requests become permanently locked.
- Any attempt to update (`PUT /api/requests/:id`) a request in `Submitted`, `Approved`, or `Rejected` state returns `409 Conflict`.
- The frontend cannot tamper with `status`, `grandTotal`, `createdAt`, or `updatedAt` through update payloads.

### 3. Server-Side Calculations
- $\text{Line Total} = \text{quantity} \times \text{price}$
- $\text{Grand Total} = \sum (\text{Line Totals})$
- Grand total and line totals sent by the client are strictly ignored and recalculated securely on the server.

---

## REST API Documentation

Base URL: `http://localhost:3000/api`

### 1. Create Request
- **Endpoint**: `POST /api/requests`
- **Request Body**:
  ```json
  {
    "title": "Office Equipment",
    "requester": "John Doe",
    "lineItems": [
      { "description": "Laptop", "quantity": 2, "price": 50000 },
      { "description": "Mouse", "quantity": 2, "price": 1000 }
    ]
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "id": "REQ-001",
    "title": "Office Equipment",
    "requester": "John Doe",
    "lineItems": [
      { "id": "LI-1", "description": "Laptop", "quantity": 2, "price": 50000, "total": 100000 },
      { "id": "LI-2", "description": "Mouse", "quantity": 2, "price": 1000, "total": 2000 }
    ],
    "grandTotal": 102000,
    "status": "Editable",
    "createdAt": "2026-09-20T05:00:00.000Z",
    "updatedAt": "2026-09-20T05:00:00.000Z"
  }
  ```
- **Errors**: `400 Bad Request` if title, requester, or line items are invalid.

### 2. Get Requests List
- **Endpoint**: `GET /api/requests?search=office&status=Submitted&page=1&limit=10`
- **Query Parameters**:
  - `search`: Filter by request title (case-insensitive substring)
  - `status`: Filter by status (`Editable`, `Submitted`, `Approved`, `Rejected`)
  - `page`: Page number (default: 1)
  - `limit`: Number of items per page (default: 10)
- **Response**: `200 OK`
  ```json
  {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 25,
      "totalPages": 3
    }
  }
  ```
- If no results match: Returns `data: []` with `totalItems: 0`, `totalPages: 0` (no error).

### 3. Get Single Request
- **Endpoint**: `GET /api/requests/:id`
- **Response**: `200 OK` with full request details.
- **Errors**: `404 Not Found` if request ID does not exist.

### 4. Update Request
- **Endpoint**: `PUT /api/requests/:id`
- **Request Body**:
  ```json
  {
    "title": "Updated Title",
    "requester": "John Doe",
    "lineItems": [
      { "description": "Laptop Pro", "quantity": 2, "price": 60000 }
    ]
  }
  ```
- **Response**: `200 OK` with recalculated totals.
- **Errors**:
  - `404 Not Found` if request does not exist.
  - `409 Conflict` if request status is not `Editable`.
  - `400 Bad Request` if payload validation fails.

### 5. Submit Request
- **Endpoint**: `POST /api/requests/:id/submit`
- **Response**: `200 OK` (status updated to `Submitted`).
- **Errors**:
  - `409 Conflict` if request status is not `Editable`.
  - `404 Not Found` if request does not exist.

### 6. Approve Request
- **Endpoint**: `POST /api/requests/:id/approve`
- **Response**: `200 OK` (status updated to `Approved`).
- **Errors**:
  - `409 Conflict` if request status is not `Submitted`.
  - `404 Not Found` if request does not exist.

### 7. Reject Request
- **Endpoint**: `POST /api/requests/:id/reject`
- **Response**: `200 OK` (status updated to `Rejected`).
- **Errors**:
  - `409 Conflict` if request status is not `Submitted`.
  - `404 Not Found` if request does not exist.

---

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

---

## Running the Application

### 1. Start the Backend Server
```bash
cd backend
npm start
```
> **Note for Windows PowerShell users**: If running in a directory path containing spaces (e.g. `Antigravity Project`), PowerShell's built-in `npm.ps1` wrapper may exit prematurely. Use `npm.cmd start` (or `node src/server.js`):
> ```powershell
> cd backend
> npm.cmd start
> ```
The backend starts on: **http://localhost:3000**

### 2. Start the Frontend Development Server
```bash
cd frontend
npm start
```
> **Note for Windows PowerShell users**: Use `npm.cmd start` (or `npx ng serve`):
> ```powershell
> cd frontend
> npm.cmd start
> ```
The frontend application opens on: **http://localhost:4200**

---

## Automated Testing

The backend includes a comprehensive test suite (29 tests) verifying every business rule, lifecycle constraint, validation edge case, and pagination logic using Jest and Supertest.

To run the backend test suite:
```bash
cd backend
npm test
```

### Test Coverage Highlights:
- Request creation & input validation
- Mandatory field validations (title, requester, line items)
- Rejection of invalid quantities and prices ($\le 0$)
- Server calculation integrity (tampered client grand total ignored)
- State transitions (`Editable` → `Submitted` → `Approved` / `Rejected`)
- Rejection of unauthorized transitions (409 Conflict)
- Prevention of editing locked requests
- Search, filter, and pagination
- Graceful 404 handling for non-existent IDs
