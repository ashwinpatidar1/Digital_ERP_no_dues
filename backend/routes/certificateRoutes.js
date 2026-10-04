const express = require("express");
const db = require("../config/db");

const router = express.Router();

router.get("/verify/:verificationCode", async (req, res) => {
    try {
        const { verificationCode } = req.params;

        const [rows] = await db.query(
            `SELECT
                c.certificate_number,
                c.verification_code,
                c.issued_at,
                a.status,
                s.enrollment_no,
                s.course,
                s.branch,
                s.batch,
                u.name AS student_name
             FROM certificates c
             JOIN no_dues_applications a
                ON c.application_id = a.id
             JOIN students s
                ON a.student_id = s.id
             JOIN users u
                ON s.user_id = u.id
             WHERE c.verification_code = ?`,
            [verificationCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                verified: false,
                message: "Certificate not found"
            });
        }

        const certificate = rows[0];

        res.json({
            verified: true,
            certificate
        });

    } catch (error) {
        console.error("Certificate verification error:", error);

        res.status(500).json({
            message: "Certificate verification failed"
        });
    }
});

module.exports = router;