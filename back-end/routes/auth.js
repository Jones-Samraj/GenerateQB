const express = require('express');
const router = express.Router();
const db = require("../db");
const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt'); // Removed bcrypt

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/check-user', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const query = `
    SELECT u.id, u.email, r.role AS role_name
    FROM users u
    LEFT JOIN role r ON u.role = r.id
    WHERE u.email = ?
    LIMIT 1
  `;
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (!results.length) return res.status(404).json({ success: false, message: 'User not found' });

    const user = results[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role_name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      success: true,
      user: {
        // id: user.id,
        email: user.email,
        role: user.role_name
      },
      token
    });
  });
});

router.post('/manual-login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

  const query = `
    SELECT u.id, u.email, u.password, r.role AS role_name
    FROM users u
    LEFT JOIN role r ON u.role = r.id
    WHERE u.email = ? AND u.password = ?
    LIMIT 1
  `;
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (!results.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = results[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role_name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      success: true,
      user: {
        // id: user.id,
        email: user.email,
        role: user.role_name
      },
      token
    });
  });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Email and password are required");
  }

  const query = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(query, [email, password], (err, results) => {
    if (err) return res.status(500).send("Server error");
    if (results.length === 0) {
      return res.status(401).send("Invalid credentials");
    }

    const user = results[0];
    // Password is now checked by the database query, no bcrypt comparison needed.

    // If the user is an admin, log them in directly.
    if (user.role === 1) {
      const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: "admin",
      };
      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: "24h",
      });
      return res.json({ token, user: payload });
    }

    // For faculty, check for assigned courses.
    const courseQuery = `
      SELECT 
        c.id as course_id, 
        c.course_code, 
        c.subject,
        d.department
      FROM faculty_course fc
      JOIN course c ON fc.course = c.id
      JOIN department d ON fc.dept = d.id
      WHERE fc.faculty = ?
    `;

    db.query(courseQuery, [user.id], (courseErr, courseResults) => {
      if (courseErr) {
        return res.status(500).send("Error fetching faculty courses.");
      }

      if (courseResults.length === 0) {
        return res
          .status(403)
          .send("You are not assigned to any courses. Please contact an admin.");
      }

      if (courseResults.length > 1) {
        // Multiple courses found, ask user to select one.
        const userPayload = {
          id: user.id,
          email: user.email,
          name: user.name,
          faculty_id: user.faculty_id,
          photo: user.photo,
          role: user.role,
        };
        return res.json({
          requiresSelection: true,
          user: userPayload,
          courses: courseResults,
        });
      }

      // Single course found, log them in directly with that course.
      const singleCourse = courseResults[0];
      const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        faculty_id: user.faculty_id,
        role: "faculty",
        course_id: singleCourse.course_id,
        course_code: singleCourse.course_code,
      };
      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: "24h",
      });
      res.json({ token, user: payload });
    });
  });
});

// NEW: Route to handle course selection and finalize login
router.post("/select-course", (req, res) => {
  const { userId, courseId } = req.body;

  if (!userId || !courseId) {
    return res.status(400).send("User ID and Course ID are required.");
  }

  const userQuery = "SELECT * FROM users WHERE id = ?";
  db.query(userQuery, [userId], (userErr, userResults) => {
    if (userErr || userResults.length === 0) {
      return res.status(404).send("User not found.");
    }
    const user = userResults[0];

    const courseQuery = `
      SELECT c.id as course_id, c.course_code 
      FROM faculty_course fc
      JOIN course c ON fc.course = c.id
      WHERE fc.faculty = ? AND fc.course = ?
    `;
    db.query(courseQuery, [userId, courseId], (courseErr, courseResults) => {
      if (courseErr || courseResults.length === 0) {
        return res
          .status(403)
          .send("User is not assigned to the selected course.");
      }
      const selectedCourse = courseResults[0];

      const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        faculty_id: user.faculty_id,
        role: "faculty",
        course_id: selectedCourse.course_id,
        course_code: selectedCourse.course_code,
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: "24h",
      });

      res.json({ token, user: payload });
    });
  });
});

module.exports = router;
