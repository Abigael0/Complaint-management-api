# Complaint Management Portal API

A role-based REST API for submitting, assigning, tracking, and resolving customer complaints. The API is built with Node.js, Express, and MongoDB/Mongoose.

## Features

- User registration, login, and JWT-protected routes
- Roles for `USER`, `HANDLER`, and `ADMIN`
- Complaint submission, assignment, rejection, resolution, and closure
- Complaint comments and status history
- User, handler, and admin dashboards
- Centralized error handling, request rate limits, Helmet security headers, and request logging

## Requirements

- Node.js and npm
- MongoDB running locally or a MongoDB connection URI

## Setup

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Create a `.env` file in the repository root:

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/complaint-portal
   JWT_SECRET=replace-with-a-long-random-secret
   PORT=8000
   ```

   Keep `.env` private. Do not commit database credentials or JWT secrets. The `.gitignore` excludes `.env` and `node_modules/`.

3. Start the API in development mode:

   ```bash
   npm run dev
   ```

   Or start it without the development watcher:

   ```bash
   npm start
   ```

The API listens on port `8000` by default. Set `PORT` to use another port. Check that it is running at `http://localhost:8000/api/health`.

## Scripts

| Command                | Description                    |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Start with Nodemon             |
| `npm start`            | Start the API                  |
| `npm run create-admin` | Run the admin bootstrap script |
| `npm test`             | Tests are not configured yet   |

**Admin bootstrap warning:** `scripts/createAdmin.js` currently defines fixed credentials in source code. Review and change that script before running it, and do not use its current credentials in a deployed environment.

## Authentication and Roles

Send the JWT returned by login in the authorization header for protected endpoints:

```http
Authorization: Bearer <token>
```

| Role      | Capabilities                                                                                 |
| --------- | -------------------------------------------------------------------------------------------- |
| `USER`    | Submit and view own complaints, add comments, close resolved complaints, view user dashboard |
| `HANDLER` | View assigned complaints, update status, resolve complaints, view handler dashboard          |
| `ADMIN`   | View all complaints, assign or reject pending complaints, view admin dashboard               |

## Error Handling

Controllers and authentication middleware throw `AppError` for expected request failures, such as invalid input, missing records, or insufficient permissions. Their `catch` blocks pass errors to Express with `next(error)`. The centralized error middleware in `middleware/error.middleware.js` formats these errors and handles known Mongoose and JWT errors; unexpected errors receive a generic `500` response.

## API Routes

All routes are prefixed with the paths shown below. Protected routes require a valid bearer token; role-specific routes also require the listed role.

| Method  | Path                                  | Access        | Description                              |
| ------- | ------------------------------------- | ------------- | ---------------------------------------- |
| `GET`   | `/`                                   | Public        | API status                               |
| `GET`   | `/api/health`                         | Public        | Health check                             |
| `POST`  | `/api/auth/register`                  | Public        | Register a user                          |
| `POST`  | `/api/auth/login`                     | Public        | Log in and receive a JWT                 |
| `GET`   | `/api/auth/me`                        | Authenticated | Get the current user                     |
| `GET`   | `/api/user/dashboard`                 | `USER`        | Get user dashboard data                  |
| `POST`  | `/api/complaints`                     | `USER`        | Submit a complaint                       |
| `GET`   | `/api/complaints/my`                  | `USER`        | List the current user's complaints       |
| `GET`   | `/api/complaints/:id`                 | `USER`        | Get one of the current user's complaints |
| `PATCH` | `/api/complaints/:id/close`           | `USER`        | Close a resolved complaint               |
| `GET`   | `/api/complaints/:id/comments`        | Authenticated | List complaint comments                  |
| `POST`  | `/api/complaints/:id/comments`        | Authenticated | Add a complaint comment                  |
| `GET`   | `/api/handler/dashboard`              | `HANDLER`     | Get handler dashboard data               |
| `GET`   | `/api/handler/complaints`             | `HANDLER`     | List complaints assigned to the handler  |
| `GET`   | `/api/handler/complaints/:id`         | `HANDLER`     | Get an assigned complaint                |
| `PATCH` | `/api/handler/complaints/:id/status`  | `HANDLER`     | Mark an assigned complaint in progress   |
| `PATCH` | `/api/handler/complaints/:id/resolve` | `HANDLER`     | Resolve an assigned complaint            |
| `GET`   | `/api/admin/dashboard`                | `ADMIN`       | Get admin dashboard data                 |
| `GET`   | `/api/admin/complaints`               | `ADMIN`       | List and filter complaints               |
| `GET`   | `/api/admin/complaints/:id`           | `ADMIN`       | Get a complaint                          |
| `PATCH` | `/api/admin/complaints/:id/assign`    | `ADMIN`       | Assign a pending complaint to a handler  |
| `PATCH` | `/api/admin/complaints/:id/reject`    | `ADMIN`       | Reject a pending complaint               |

Complaint categories are `PAYMENT`, `ACCOUNT`, `TECHNICAL`, `SERVICE`, and `OTHER`. Priorities are `LOW`, `MEDIUM`, `HIGH`, and `URGENT`. Statuses progress through `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, and `CLOSED`; pending complaints may also be `REJECTED`.

For the user complaint routes, `:id` is the public complaint ID. The comments controller looks up complaints by MongoDB document ID (`_id`), so the `:id` in comment routes must be that MongoDB ID.

## Project Structure

```text
config/       Database connection
controllers/  Request handlers
middleware/   Authentication, authorization, and error handling
models/       Mongoose models
routes/       Express route definitions
scripts/      Administrative scripts
services/     Complaint business logic
utils/        Shared helpers and errors
server.js     Express application entry point
```
