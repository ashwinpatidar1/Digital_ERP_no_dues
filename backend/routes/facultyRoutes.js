const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const db = require("../config/db");

const router = express.Router();

// ===============================
// Faculty Profile
// ===============================
router.get("/profile", authenticateToken, (req, res) => {
  res.json({
    message: "Faculty authentication successful",
    user: req.user,
  });
});

// ===============================
// Get Faculty Applications
// ===============================
router.get("/applications", authenticateToken, async (req, res) => {
  try {
    // Make sure the logged-in user is faculty
    if (req.user.role !== "FACULTY") {
      return res.status(403).json({
        message: "Faculty access required",
      });
    }

    const departmentId = req.user.department_id;

    const [applications] = await db.query(
      `SELECT
                dc.id AS clearance_id,
                dc.application_id,

                s.enrollment_no,
                u.name AS student_name,

                s.course,
                s.branch,
                s.semester,
                s.batch,

                d.department_name,

                dc.status,
                dc.remarks,
                dc.reviewed_at,

                nda.application_date,
                nda.submitted_at

             FROM department_clearances dc

             JOIN no_dues_applications nda
                 ON dc.application_id = nda.id

             JOIN students s
                 ON nda.student_id = s.id

             JOIN users u
                 ON s.user_id = u.id

             JOIN departments d
                 ON dc.department_id = d.id

             WHERE dc.department_id = ?

             ORDER BY
                 CASE
                     WHEN dc.status = 'PENDING' THEN 1
                     WHEN dc.status = 'REJECTED' THEN 2
                     WHEN dc.status = 'APPROVED' THEN 3
                 END,
                 nda.application_date DESC`,
      [departmentId],
    );

    res.json({
      department_id: departmentId,
      applications,
    });
  } catch (error) {
    console.error("Faculty applications error:", error);

    res.status(500).json({
      message: "Failed to fetch faculty applications",
    });
  }
});

// ===============================
// Approve Department Clearance
// ===============================
router.put("/applications/:id/approve", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    // Check faculty role
    if (req.user.role !== "FACULTY") {
      return res.status(403).json({
        message: "Faculty access required",
      });
    }

    const applicationId = req.params.id;
    const departmentId = req.user.department_id;
    const facultyId = req.user.faculty_db_id;

    const { remarks } = req.body || {};

    // Start transaction
    await connection.beginTransaction();

    // Find the clearance belonging to this department
    const [rows] = await connection.query(
      `SELECT
                dc.id,
                dc.application_id,
                dc.department_id,
                dc.status
             FROM department_clearances dc
             WHERE dc.application_id = ?
               AND dc.department_id = ?
             FOR UPDATE`,
      [applicationId, departmentId],
    );

    // Application not found for this department
    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Application not found for your department",
      });
    }

    const clearance = rows[0];

    // Already processed
    if (clearance.status !== "PENDING") {
      await connection.rollback();

      return res.status(400).json({
        message: `Application is already ${clearance.status.toLowerCase()}`,
      });
    }

    // Approve clearance
    await connection.query(
      `UPDATE department_clearances
             SET
                faculty_id = ?,
                status = 'APPROVED',
                remarks = ?,
                reviewed_at = NOW()
             WHERE id = ?`,
      [facultyId, remarks || "Clearance approved.", clearance.id],
    );

    // Check the overall application status
    const [clearanceSummary] = await connection.query(
      `SELECT
        COUNT(*) AS total,
        SUM(status = 'APPROVED') AS approved,
        SUM(status = 'REJECTED') AS rejected,
        SUM(status = 'PENDING') AS pending
     FROM department_clearances
     WHERE application_id = ?`,
      [applicationId],
    );

    const summary = clearanceSummary[0];

    const total = Number(summary.total);
    const approved = Number(summary.approved);
    const rejected = Number(summary.rejected);
    const pending = Number(summary.pending);

    let applicationStatus = "IN_PROGRESS";

    if (rejected > 0) {
      applicationStatus = "REJECTED";
    } else if (pending === 0 && approved === total) {
      applicationStatus = "DIRECTOR_PENDING";
    } else {
      applicationStatus = "IN_PROGRESS";
    }

    // Update main application status
    await connection.query(
      `UPDATE no_dues_applications
     SET status = ?
     WHERE id = ?`,
      [applicationStatus, applicationId],
    );

    // Create audit log
    await connection.query(
      `INSERT INTO audit_logs
                (user_id, action, entity_type, entity_id, description)
             VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        "APPROVE",
        "DEPARTMENT_CLEARANCE",
        clearance.id,
        `Faculty ${req.user.faculty_id} approved clearance for Application #${applicationId}.`,
      ],
    );

    // Commit transaction
    await connection.commit();

    res.json({
      message: "Application approved successfully",
      application_id: Number(applicationId),
      clearance_id: clearance.id,
      status: "APPROVED",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Approval error:", error);

    res.status(500).json({
      message: "Failed to approve application",
    });
  } finally {
    connection.release();
  }
});

// ===============================
// Reject Department Clearance
// ===============================
router.put("/applications/:id/reject", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    // Check faculty role
    if (req.user.role !== "FACULTY") {
      return res.status(403).json({
        message: "Faculty access required",
      });
    }

    const applicationId = req.params.id;
    const departmentId = req.user.department_id;
    const facultyId = req.user.faculty_db_id;

    const { remarks } = req.body || {};

    // Rejection reason is mandatory
    if (!remarks || remarks.trim() === "") {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    await connection.beginTransaction();

    // Find clearance belonging to this faculty's department
    const [rows] = await connection.query(
      `SELECT
                id,
                application_id,
                department_id,
                status
             FROM department_clearances
             WHERE application_id = ?
               AND department_id = ?
             FOR UPDATE`,
      [applicationId, departmentId],
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Application not found for your department",
      });
    }

    const clearance = rows[0];

    // Only pending applications can be rejected
    if (clearance.status !== "PENDING") {
      await connection.rollback();

      return res.status(400).json({
        message: `Application is already ${clearance.status.toLowerCase()}`,
      });
    }

    // Reject clearance
    await connection.query(
      `UPDATE department_clearances
             SET
                faculty_id = ?,
                status = 'REJECTED',
                remarks = ?,
                reviewed_at = NOW()
             WHERE id = ?`,
      [facultyId, remarks.trim(), clearance.id],
    );

    // Update main application status
    await connection.query(
      `UPDATE no_dues_applications
             SET status = 'REJECTED'
             WHERE id = ?`,
      [applicationId],
    );

    // Create audit log
    await connection.query(
      `INSERT INTO audit_logs
                (user_id, action, entity_type, entity_id, description)
             VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        "REJECT",
        "DEPARTMENT_CLEARANCE",
        clearance.id,
        `Faculty ${req.user.faculty_id} rejected Application #${applicationId}. Reason: ${remarks.trim()}`,
      ],
    );

    await connection.commit();

    res.json({
      message: "Application rejected successfully",
      application_id: Number(applicationId),
      clearance_id: clearance.id,
      status: "REJECTED",
      remarks: remarks.trim(),
    });
  } catch (error) {
    await connection.rollback();

    console.error("Rejection error:", error);

    res.status(500).json({
      message: "Failed to reject application",
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
