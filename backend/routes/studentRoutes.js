const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// Get Logged-in Student's Application
// ========================================
router.get("/application", authenticateToken, async (req, res) => {
  try {
    // Only students can access this route
    if (req.user.role !== "STUDENT") {
      return res.status(403).json({
        message: "Student access required",
      });
    }

    const studentId = req.user.student_db_id;

    // Get latest application of logged-in student
    const [applicationRows] = await db.query(
      `SELECT
                nda.id AS application_id,
                nda.student_id,
                nda.application_date,
                nda.submitted_at,
                nda.completed_at,
                nda.status,
                nda.rejection_reason,

                s.enrollment_no,
                s.course,
                s.branch,
                s.semester,
                s.batch,

                u.name AS student_name,
                u.email

             FROM no_dues_applications nda

             JOIN students s
                 ON nda.student_id = s.id

             JOIN users u
                 ON s.user_id = u.id

             WHERE nda.student_id = ?

             ORDER BY nda.id DESC

             LIMIT 1`,
      [studentId],
    );

    if (applicationRows.length === 0) {
      return res.status(404).json({
        message: "No-Dues application not found",
      });
    }

    const application = applicationRows[0];

    // Get department-wise clearance
    const [clearances] = await db.query(
      `SELECT
                dc.id AS clearance_id,
                dc.department_id,
                d.department_name,

                dc.status,
                dc.remarks,
                dc.reviewed_at,

                f.faculty_id

             FROM department_clearances dc

             JOIN departments d
                 ON dc.department_id = d.id

             LEFT JOIN faculty f
                 ON dc.faculty_id = f.id

             WHERE dc.application_id = ?

             ORDER BY dc.department_id`,
      [application.application_id],
    );

    res.json({
      application: {
        id: application.application_id,
        status: application.status,
        rejection_reason: application.rejection_reason,
        application_date: application.application_date,
        submitted_at: application.submitted_at,
        completed_at: application.completed_at,
      },

      student: {
        id: application.student_id,
        enrollment_no: application.enrollment_no,
        name: application.student_name,
        email: application.email,
        course: application.course,
        branch: application.branch,
        semester: application.semester,
        batch: application.batch,
      },

      clearances,
    });
  } catch (error) {
    console.error("Student application error:", error);

    res.status(500).json({
      message: "Failed to fetch student application",
    });
  }
});

// ========================================
// Resubmit Rejected Application
// ========================================
router.put(
  "/applications/:id/resubmit",
  authenticateToken,
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      if (req.user.role !== "STUDENT") {
        return res.status(403).json({
          message: "Student access required",
        });
      }

      const applicationId = req.params.id;
      const studentId = req.user.student_db_id;

      await connection.beginTransaction();

      // Find the student's rejected application
      const [applications] = await connection.query(
        `SELECT id, student_id, status, rejection_reason
             FROM no_dues_applications
             WHERE id = ?
               AND student_id = ?
             FOR UPDATE`,
        [applicationId, studentId],
      );

      if (applications.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: "Application not found",
        });
      }

      const application = applications[0];

      if (application.status !== "REJECTED") {
        await connection.rollback();

        return res.status(400).json({
          message: "Only rejected applications can be resubmitted",
        });
      }

      // Check whether the rejection came from a department
      const [rejectedClearances] = await connection.query(
        `SELECT id
             FROM department_clearances
             WHERE application_id = ?
               AND status = 'REJECTED'`,
        [applicationId],
      );

      let resetClearances = 0;

      if (rejectedClearances.length > 0) {
        // Department rejection:
        // Reset only rejected departments.
        await connection.query(
          `UPDATE department_clearances
                 SET status = 'PENDING',
                     faculty_id = NULL,
                     remarks = NULL,
                     reviewed_at = NULL
                 WHERE application_id = ?
                   AND status = 'REJECTED'`,
          [applicationId],
        );

        resetClearances = rejectedClearances.length;
      } else {
        // Director rejection:
        // All departments had already approved.
        // Restart the department clearance process.
        const [clearanceResult] = await connection.query(
          `UPDATE department_clearances
                 SET status = 'PENDING',
                     faculty_id = NULL,
                     remarks = NULL,
                     reviewed_at = NULL
                 WHERE application_id = ?`,
          [applicationId],
        );

        resetClearances = clearanceResult.affectedRows;
      }

      // Move application back into department review
      await connection.query(
        `UPDATE no_dues_applications
             SET status = 'IN_PROGRESS',
                 rejection_reason = NULL,
                 submitted_at = NOW(),
                 completed_at = NULL
             WHERE id = ?`,
        [applicationId],
      );

      // Audit log
      await connection.query(
        `INSERT INTO audit_logs
                (user_id, action, entity_type, entity_id, description)
             VALUES (?, ?, ?, ?, ?)`,
        [
          req.user.user_id,
          "RESUBMIT",
          "NO_DUES_APPLICATION",
          applicationId,
          `Student ${req.user.enrollment_no} resubmitted Application #${applicationId}.`,
        ],
      );

      await connection.commit();

      res.json({
        message: "Application resubmitted successfully",
        application_id: Number(applicationId),
        status: "IN_PROGRESS",
        reset_clearances: resetClearances,
      });
    } catch (error) {
      await connection.rollback();

      console.error("Resubmission error:", error);

      res.status(500).json({
        message: "Failed to resubmit application",
      });
    } finally {
      connection.release();
    }
  },
);

router.post("/applications", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (req.user.role !== "STUDENT") {
      return res.status(403).json({
        message: "Student access required",
      });
    }

    const studentId = req.user.student_db_id;

    await connection.beginTransaction();

    // 1. Check whether the student already has an active application
    const [existingApplications] = await connection.query(
      `SELECT id, status
             FROM no_dues_applications
             WHERE student_id = ?
               AND status IN ('PENDING', 'IN_PROGRESS')
             LIMIT 1`,
      [studentId],
    );

    if (existingApplications.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "You already have an active no-dues application",
        application_id: existingApplications[0].id,
        status: existingApplications[0].status,
      });
    }

    // 2. Create the main application
    const [applicationResult] = await connection.query(
      `INSERT INTO no_dues_applications
                (student_id, status, submitted_at)
             VALUES (?, 'IN_PROGRESS', NOW())`,
      [studentId],
    );

    const applicationId = applicationResult.insertId;

    // 3. Get all clearance departments except Director Office
    const [departments] = await connection.query(
      `SELECT id
             FROM departments
             WHERE department_code IN ('ACA', 'PLC', 'ACC', 'LIB', 'SPT')`,
    );

    // 4. Create department clearances
    for (const department of departments) {
      await connection.query(
        `INSERT INTO department_clearances
                    (application_id, department_id, status)
                 VALUES (?, ?, 'PENDING')`,
        [applicationId, department.id],
      );
    }

    // 5. Create audit log
    await connection.query(
      `INSERT INTO audit_logs
                (user_id, action, entity_type, entity_id, description)
             VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        "SUBMIT",
        "NO_DUES_APPLICATION",
        applicationId,
        `Student ${req.user.enrollment_no} submitted Application #${applicationId}.`,
      ],
    );

    await connection.commit();

    res.status(201).json({
      message: "No-dues application submitted successfully",
      application_id: applicationId,
      status: "IN_PROGRESS",
      departments: departments.length,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Application submission error:", error);

    res.status(500).json({
      message: "Failed to submit no-dues application",
    });
  } finally {
    connection.release();
  }
});

router.get("/certificate", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "STUDENT") {
      return res.status(403).json({
        message: "Student access required",
      });
    }

    const studentId = req.user.student_db_id;

    const [certificates] = await db.query(
      `SELECT
                c.id,
                c.application_id,
                c.certificate_number,
                c.verification_code,
                c.issued_at
             FROM certificates c
             JOIN no_dues_applications a
                ON c.application_id = a.id
             WHERE a.student_id = ?
             ORDER BY c.issued_at DESC
             LIMIT 1`,
      [studentId],
    );

    if (certificates.length === 0) {
      return res.status(404).json({
        message: "No certificate found",
      });
    }

    res.json({
      certificate: certificates[0],
    });
  } catch (error) {
    console.error("Certificate fetch error:", error);

    res.status(500).json({
      message: "Failed to fetch certificate",
    });
  }
});

module.exports = router;
