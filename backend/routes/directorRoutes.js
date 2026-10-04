const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");
const crypto = require("crypto");

const router = express.Router();

router.get("/applications", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "DIRECTOR") {
      return res.status(403).json({
        message: "Director access required",
      });
    }

    const [applications] = await db.query(
      `SELECT
                a.id AS application_id,
                a.application_date,
                a.submitted_at,
                a.status,

                s.id AS student_id,
                s.enrollment_no,
                s.course,
                s.branch,
                s.semester,
                s.batch,

                u.name AS student_name,
                u.email AS student_email

             FROM no_dues_applications a

             JOIN students s
                ON a.student_id = s.id

             JOIN users u
                ON s.user_id = u.id

             WHERE a.status = 'DIRECTOR_PENDING'

             ORDER BY a.submitted_at ASC`,
    );

    res.json({
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Director applications error:", error);

    res.status(500).json({
      message: "Failed to fetch director applications",
    });
  }
});

router.put("/applications/:id/approve", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (req.user.role !== "DIRECTOR") {
      return res.status(403).json({
        message: "Director access required",
      });
    }

    const applicationId = req.params.id;

    await connection.beginTransaction();

    // Check that the application is waiting for Director approval
    const [applications] = await connection.query(
      `SELECT id, student_id, status
             FROM no_dues_applications
             WHERE id = ?
             FOR UPDATE`,
      [applicationId],
    );

    if (applications.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Application not found",
      });
    }

    const application = applications[0];

    if (application.status !== "DIRECTOR_PENDING") {
      await connection.rollback();

      return res.status(400).json({
        message: `Application is currently ${application.status}`,
      });
    }

    // Final approval
    await connection.query(
      `UPDATE no_dues_applications
             SET status = 'COMPLETED',
                 completed_at = NOW()
             WHERE id = ?`,
      [applicationId],
    );

    // Generate certificate details
    const certificateNumber = `NDC-${new Date().getFullYear()}-${applicationId
      .toString()
      .padStart(6, "0")}`;

    const verificationCode = crypto
      .randomBytes(8)
      .toString("hex")
      .toUpperCase();

    const [existingCertificate] = await connection.query(
      `SELECT id
     FROM certificates
     WHERE application_id = ?`,
      [applicationId],
    );

    if (existingCertificate.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "Certificate already exists for this application",
      });
    }

    // Create certificate record
    await connection.query(
      `INSERT INTO certificates
        (application_id, certificate_number, verification_code)
     VALUES (?, ?, ?)`,
      [applicationId, certificateNumber, verificationCode],
    );
    // Audit log
    await connection.query(
      `INSERT INTO audit_logs
                (user_id, action, entity_type, entity_id, description)
             VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        "DIRECTOR_APPROVE",
        "NO_DUES_APPLICATION",
        applicationId,
        `Director approved Application #${applicationId}.`,
      ],
    );

    await connection.commit();

    res.json({
      message: "Application approved by Director",
      application_id: Number(applicationId),
      status: "COMPLETED",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Director approval error:", error);

    res.status(500).json({
      message: "Failed to approve application",
    });
  } finally {
    connection.release();
  }
});

router.put("/applications/:id/reject", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (req.user.role !== "DIRECTOR") {
      return res.status(403).json({
        message: "Director access required",
      });
    }

    const applicationId = req.params.id;
    const { remarks } = req.body || {};

    if (!remarks || remarks.trim() === "") {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    await connection.beginTransaction();

    const [applications] = await connection.query(
      `SELECT id, student_id, status
             FROM no_dues_applications
             WHERE id = ?
             FOR UPDATE`,
      [applicationId],
    );

    if (applications.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Application not found",
      });
    }

    const application = applications[0];

    if (application.status !== "DIRECTOR_PENDING") {
      await connection.rollback();

      return res.status(400).json({
        message: `Application is currently ${application.status}`,
      });
    }

    await connection.query(
      `UPDATE no_dues_applications
     SET status = 'REJECTED',
         rejection_reason = ?
     WHERE id = ?`,
      [remarks.trim(), applicationId],
    );

    await connection.query(
      `INSERT INTO audit_logs
                (user_id, action, entity_type, entity_id, description)
             VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        "DIRECTOR_REJECT",
        "NO_DUES_APPLICATION",
        applicationId,
        `Director rejected Application #${applicationId}. Reason: ${remarks.trim()}`,
      ],
    );

    await connection.commit();

    res.json({
      message: "Application rejected by Director",
      application_id: Number(applicationId),
      status: "REJECTED",
      remarks: remarks.trim(),
    });
  } catch (error) {
    await connection.rollback();

    console.error("Director rejection error:", error);

    res.status(500).json({
      message: "Failed to reject application",
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
