const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const facultyLogin = async (req, res) => {
    try {
        const { faculty_id, password } = req.body;

        // Validate input
        if (!faculty_id || !password) {
            return res.status(400).json({
                message: "Faculty ID and password are required"
            });
        }

        // Find faculty
        const [rows] = await db.query(
            `SELECT 
                u.id AS user_id,
                u.institution_id,
                u.name,
                u.email,
                u.password_hash,
                u.role,
                u.is_active,
                f.id AS faculty_db_id,
                f.faculty_id,
                f.department_id,
                f.designation,
                d.department_name
             FROM users u
             JOIN faculty f ON u.id = f.user_id
             JOIN departments d ON f.department_id = d.id
             WHERE f.faculty_id = ?`,
            [faculty_id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Invalid Faculty ID or password"
            });
        }

        const faculty = rows[0];

        // Check account status
        if (!faculty.is_active) {
            return res.status(403).json({
                message: "Faculty account is inactive"
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            faculty.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid Faculty ID or password"
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                user_id: faculty.user_id,
                faculty_db_id: faculty.faculty_db_id,
                faculty_id: faculty.faculty_id,
                department_id: faculty.department_id,
                role: faculty.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        res.json({
            message: "Faculty login successful",
            token,
            faculty: {
                id: faculty.faculty_db_id,
                faculty_id: faculty.faculty_id,
                name: faculty.name,
                email: faculty.email,
                department_id: faculty.department_id,
                department_name: faculty.department_name,
                designation: faculty.designation
            }
        });

    } catch (error) {
        console.error("Faculty login error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
};


const studentLogin = async (req, res) => {
    try {
        const { enrollment_no, password } = req.body || {};

        // Validate input
        if (!enrollment_no || !password) {
            return res.status(400).json({
                message: "Enrollment number and password are required"
            });
        }

        // Find student
        const [rows] = await db.query(
            `SELECT
                u.id AS user_id,
                u.institution_id,
                u.name,
                u.email,
                u.password_hash,
                u.role,
                u.is_active,

                s.id AS student_db_id,
                s.enrollment_no,
                s.course,
                s.branch,
                s.semester,
                s.batch

             FROM users u

             JOIN students s
                 ON u.id = s.user_id

             WHERE s.enrollment_no = ?`,
            [enrollment_no]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Invalid enrollment number or password"
            });
        }

        const student = rows[0];

        // Check account status
        if (!student.is_active) {
            return res.status(403).json({
                message: "Student account is inactive"
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            student.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid enrollment number or password"
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                user_id: student.user_id,
                student_db_id: student.student_db_id,
                enrollment_no: student.enrollment_no,
                role: student.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        res.json({
            message: "Student login successful",
            token,
            student: {
                id: student.student_db_id,
                enrollment_no: student.enrollment_no,
                name: student.name,
                email: student.email,
                course: student.course,
                branch: student.branch,
                semester: student.semester,
                batch: student.batch
            }
        });

    } catch (error) {
        console.error("Student login error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const directorLogin = async (req, res) => {
    try {
        const { institution_id, password } = req.body || {};

        if (!institution_id || !password) {
            return res.status(400).json({
                message: "Director ID and password are required"
            });
        }

        const [rows] = await db.query(
            `SELECT
                u.id AS user_id,
                u.institution_id,
                u.name,
                u.email,
                u.password_hash,
                u.role,
                u.is_active
             FROM users u
             WHERE u.institution_id = ?
               AND u.role = 'DIRECTOR'`,
            [institution_id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Invalid Director ID or password"
            });
        }

        const director = rows[0];

        if (!director.is_active) {
            return res.status(403).json({
                message: "Director account is inactive"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            director.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid Director ID or password"
            });
        }

        const token = jwt.sign(
            {
                user_id: director.user_id,
                institution_id: director.institution_id,
                role: director.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            message: "Director login successful",
            token,
            director: {
                id: director.user_id,
                institution_id: director.institution_id,
                name: director.name,
                email: director.email,
                role: director.role
            }
        });

    } catch (error) {
        console.error("Director login error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = {
    facultyLogin,
    studentLogin,
    directorLogin
};