const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const cors = require("cors");
require("dotenv").config();

const app = express();

const path = require("path");
const multer = require("multer");
const fs = require("fs");

const uploadDir = path.join(__dirname, "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

app.use("/uploads", express.static(uploadDir));
// Image upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
  cb(null, uploadDir);
},
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" +
      Math.round(Math.random() * 1E9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  }
});

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10
});

// Home route
app.get("/", (req, res) => {
  res.send("College Event Management System API is running!");
});

// Check API and database connection
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      status: "ok",
      message: "API and MySQL are connected successfully!"
    });
  } catch (error) {
    console.error("Health check error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database connection failed."
    });
  }
});

// Get all events
app.get("/api/events", async (req, res) => {
  try {
    const [events] = await db.query(
      "SELECT * FROM events ORDER BY event_date ASC"
    );

    res.json(events);
  } catch (error) {
    console.error("Events API error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Unable to fetch events."
    });
  }
});

app.post("/api/verify-organiser", (req, res) => {
  const { organiserPassword } = req.body;

  if (
    !process.env.ORGANISER_PASSWORD ||
    organiserPassword !== process.env.ORGANISER_PASSWORD
  ) {
    return res.status(401).json({
      status: "error",
      message: "Incorrect organiser password."
    });
  }

  res.json({
    status: "success",
    message: "Password accepted."
  });
});
// Add a new event using the common organiser password
app.post("/api/events", async (req, res) => {
  try {
    const {
      organiserPassword,
      title,
      description,
      category,
      event_date,
      venue,
      capacity,
      status
    } = req.body;

    // Check organiser password
    if (
      !process.env.ORGANISER_PASSWORD ||
      organiserPassword !== process.env.ORGANISER_PASSWORD
    ) {
      return res.status(401).json({
        status: "error",
        message: "Incorrect organiser password."
      });
    }

    // Validate event details
    if (
      !title?.trim() ||
      !category?.trim() ||
      !event_date ||
      !venue?.trim() ||
      !Number.isInteger(Number(capacity)) ||
      Number(capacity) <= 0
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please enter all required event details."
      });
    }

    // Save event in MySQL
    const [result] = await db.query(
      `INSERT INTO events
      (title, description, category, event_date, venue, capacity, status)
      VALUES (?, ?, ?, ?, ?, ?, 'upcoming')`,
      [
        title.trim(),
        description?.trim() || "",
        category.trim(),
        event_date,
        venue.trim(),
        Number(capacity)
      ]
    );

    res.status(201).json({
      status: "success",
      message: "Event added successfully!",
      eventId: result.insertId
    });

  } catch (error) {
    console.error("Add event API error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Unable to add event."
    });
  }
});


// Edit an existing event using the organiser password
app.put("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      organiserPassword,
      title,
      description,
      category,
      event_date,
      venue,
      capacity,
      status
    } = req.body;
    const allowedStatuses = ["upcoming", "ongoing", "completed"];
    const cleanStatus = String(status || "").toLowerCase();
    if (
      !process.env.ORGANISER_PASSWORD ||
      organiserPassword !== process.env.ORGANISER_PASSWORD
    ) {
      return res.status(401).json({
        status: "error",
        message: "Incorrect organiser password."
      });
    }
    if (!allowedStatuses.includes(cleanStatus)) {
      return res.status(400).json({
       status: "error",
       message: "Please select a valid event status."
    });
  }

    if (
      !Number.isInteger(Number(id)) ||
      Number(id) <= 0 ||
      !title?.trim() ||
      !category?.trim() ||
      !event_date ||
      !venue?.trim() ||
      !Number.isInteger(Number(capacity)) ||
      Number(capacity) <= 0
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please enter valid event details."
      });
    }

    const [result] = await db.query(
      `UPDATE events
       SET title = ?, description = ?, category = ?,
          event_date = ?, venue = ?, capacity = ?, status = ?
       WHERE id = ?`,
       [
         title.trim(),
         description?.trim() || "",
         category.trim(),
         event_date,
         venue.trim(),
         Number(capacity),
         cleanStatus,
        Number(id)
       ]
      
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Event not found."
      });
    }

    res.json({
      status: "success",
      message: "Event updated successfully!"
    });

  } catch (error) {
    console.error("Edit event API error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Unable to update event."
    });
  }
});

// Delete an event and its registrations safely
app.delete("/api/events/:id", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { organiserPassword } = req.body;

    if (
      !process.env.ORGANISER_PASSWORD ||
      organiserPassword !== process.env.ORGANISER_PASSWORD
    ) {
      return res.status(401).json({
        status: "error",
        message: "Incorrect organiser password."
      });
    }

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid event ID."
      });
    }

    await connection.beginTransaction();

    const [events] = await connection.query(
      "SELECT id FROM events WHERE id = ?",
      [Number(id)]
    );

    if (events.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Event not found."
      });
    }

    await connection.query(
      "DELETE FROM registrations WHERE event_id = ?",
      [Number(id)]
    );

    await connection.query(
      "DELETE FROM events WHERE id = ?",
      [Number(id)]
    );

    await connection.commit();

    res.json({
      status: "success",
      message: "Event and its registrations deleted successfully!"
    });

  } catch (error) {
    await connection.rollback();

    console.error("Delete event API error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Unable to delete event."
    });

  } finally {
    connection.release();
  }
});

// Register an existing student for an event
app.post("/api/registrations", async (req, res) => {
  try {
    const { user_id, event_id } = req.body;

    if (
      !Number.isInteger(Number(user_id)) ||
      !Number.isInteger(Number(event_id)) ||
      Number(user_id) <= 0 ||
      Number(event_id) <= 0
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid user_id and event_id are required."
      });
    }

    // Confirm that the student exists
    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ?",
      [Number(user_id)]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Student not found. A student account is required."
      });
    }

    
    // Confirm that the event exists and check its status
    const [events] = await db.query(
      "SELECT id, status FROM events WHERE id = ?",
      [Number(event_id)]
    );

    if (events.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Event not found."
      });
    }

    // Prevent registration for completed events
    if (String(events[0].status || "").toLowerCase() === "completed") {
      return res.status(400).json({
        status: "error",
        message: "Registration is closed because this event has been completed."
      });
    }

    // Prevent duplicate registrations
    const [existing] = await db.query(
      "SELECT id FROM registrations WHERE user_id = ? AND event_id = ?",
      [Number(user_id), Number(event_id)]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "This student is already registered for this event."
      });
    }

    // Save the registration
    const [result] = await db.query(
      "INSERT INTO registrations (user_id, event_id, status, registered_at) VALUES (?, ?, 'registered', NOW())",
      [Number(user_id), Number(event_id)]
    );

    res.status(201).json({
      status: "success",
      message: "Registration saved successfully!",
      registration_id: result.insertId
    });
  } catch (error) {
    console.error("Registration API error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Unable to save registration. Please check the database."
    });
  }
});


 // Student signup API
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        status: "error",
        message: "Enter your name, a valid email, and a password of at least 8 characters."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        status: "error",
        message: "Please enter a valid email address."
      });
    }

    // Check whether this email is already registered
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists."
      });
    }

    // Hash the password before saving it
    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, 'student', NOW())",
      [cleanName, cleanEmail, passwordHash]
    );

    return res.status(201).json({
      status: "success",
      message: "Student account created successfully!",
      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail
      }
    });
  } catch (error) {
    console.error("Signup API error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to create the account. Please try again."
    });
  }
});


 // Login API for students and event team leaders
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required."
      });
    }

    const [users] = await db.query(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password."
      });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password."
      });
    }

    return res.json({
      status: "success",
      message: "Login successful!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login API error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to log in. Please try again."
    });
  }
});


 // Get a student's event registrations
app.get("/api/registrations/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid student ID is required."
      });
    }

    const [registrations] = await db.query(
      `SELECT
         r.id AS registration_id,
         r.user_id,
         r.event_id,
         r.status AS registration_status,
         r.registered_at,
         e.title,
         e.description,
         e.category,
         e.event_date,
         e.venue
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = ?
       ORDER BY r.registered_at DESC`,
      [userId]
    );

    res.json(registrations);
  } catch (error) {
    console.error("My registrations API error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Unable to fetch registrations."
    });
  }
});


// Analytics API
app.get("/api/analytics", async (req, res) => {
  try {
    // Get event statistics
    const [[eventStats]] = await db.query(`
      SELECT
        COUNT(*) AS totalEvents,
        SUM(
          CASE
            WHEN status = 'upcoming' AND event_date >= NOW()
            THEN 1 ELSE 0
          END
        ) AS upcomingEvents,
        COUNT(DISTINCT category) AS totalCategories
      FROM events
    `);

    // Get registration statistics
    const [[registrationStats]] = await db.query(`
      SELECT
        COUNT(*) AS totalRegistrations,
        COUNT(DISTINCT user_id) AS registeredStudents
      FROM registrations
    `);

    // Get the five most popular events
    const [popularEvents] = await db.query(`
      SELECT
        e.id,
        e.title,
        COUNT(r.id) AS registrations
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.id, e.title
      ORDER BY registrations DESC
      LIMIT 5
    `);

    res.json({
      status: "success",
      eventStats,
      registrationStats,
      popularEvents
    });

  } catch (error) {
    console.error("Analytics API error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Unable to fetch analytics."
    });
  }
});
// Start server
async function startServer() {
  try {
    await db.query("SELECT 1");

    const port = Number(process.env.PORT || 5000);


// ================= COMMUNITY APIs =================

// Get community posts
app.get("/api/community/posts", async (req, res) => {
  try {
    const userId = Number(req.query.userId || 0);

    const [posts] = await db.query(
      `SELECT
        p.id,
        p.user_id,
        p.content,
        p.created_at,
        p.id,
        p.user_id,
        p.content,
        p.image_url,
        p.created_at,
        u.name AS author,
        (SELECT COUNT(*) FROM post_likes l
          WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM post_comments c
          WHERE c.post_id = p.id) AS comments_count,
        EXISTS(
          SELECT 1 FROM post_likes l
          WHERE l.post_id = p.id AND l.user_id = ?
        ) AS liked_by_user
      FROM community_posts p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json(posts);
  } catch (error) {
    console.error("Community posts error:", error);
    res.status(500).json({ message: "Could not load community posts." });
  }
});

// Create a community post with optional image
app.post(
  "/api/community/posts",
  (req, res, next) => {
    upload.single("image")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { user_id, content } = req.body;

      if (!user_id || (!content?.trim() && !req.file)) {
        return res.status(400).json({
          message: "Please write something or select an image."
        });
      }

      const imageUrl = req.file
        ? `/uploads/${req.file.filename}`
        : null;

      const [result] = await db.query(
        `INSERT INTO community_posts
         (user_id, content, image_url)
         VALUES (?, ?, ?)`,
        [
          Number(user_id),
          content?.trim() || "",
          imageUrl
        ]
      );

      res.status(201).json({
        message: "Post created successfully!",
        postId: result.insertId,
        image_url: imageUrl
      });

    } catch (error) {
      console.error("Create post error:", error);

      res.status(500).json({
        message: "Could not create post."
      });
    }
  }
);

// Like or unlike a post
app.post("/api/community/posts/:postId/like", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const userId = Number(req.body.user_id);

    if (!postId || !userId) {
      return res.status(400).json({ message: "Post and user are required." });
    }

    const [existing] = await db.query(
      "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
      [postId, userId]
    );

    if (existing.length > 0) {
      await db.query("DELETE FROM post_likes WHERE id = ?", [existing[0].id]);
      return res.json({ liked: false, message: "Like removed." });
    }

    await db.query(
      "INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)",
      [postId, userId]
    );

    res.json({ liked: true, message: "Post liked!" });
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ message: "Could not update like." });
  }
});

// Get comments for a post
app.get("/api/community/posts/:postId/comments", async (req, res) => {
  try {
    const [comments] = await db.query(
      `SELECT c.id, c.user_id, c.comment, c.created_at, u.name AS author
       FROM post_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.postId]
    );

    res.json(comments);
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: "Could not load comments." });
  }
});

// Add a comment
app.post("/api/community/posts/:postId/comments", async (req, res) => {
  try {
    const { user_id, comment } = req.body;

    if (!user_id || !comment || !comment.trim()) {
      return res.status(400).json({ message: "User and comment are required." });
    }

    await db.query(
      "INSERT INTO post_comments (post_id, user_id, comment) VALUES (?, ?, ?)",
      [req.params.postId, user_id, comment.trim()]
    );

    res.status(201).json({ message: "Comment added successfully!" });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: "Could not add comment." });
  }
});


// ================= NOTIFICATIONS APIs =================

// Get notifications for a student
app.get("/api/notifications/:userId", async (req, res) => {
  try {
    const [notifications] = await db.query(
      `SELECT id, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.params.userId]
    );

    res.json(notifications);
  } catch (error) {
    console.error("Notifications error:", error);
    res.status(500).json({ message: "Could not load notifications." });
  }
});

// Mark one notification as read
app.put("/api/notifications/:id/read", async (req, res) => {
  try {
    const { user_id } = req.body;

    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, user_id]
    );

    res.json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Mark notification error:", error);
    res.status(500).json({ message: "Could not update notification." });
  }
});

// Mark all notifications as read
app.put("/api/notifications/:userId/read-all", async (req, res) => {
  try {
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      [req.params.userId]
    );

    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Mark all notifications error:", error);
    res.status(500).json({ message: "Could not update notifications." });
  }
});


    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      console.log("MySQL connected successfully!");
      console.log(`Events API: http://localhost:${port}/api/events`);
      console.log("Registration API: POST /api/registrations");
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
}

startServer();
