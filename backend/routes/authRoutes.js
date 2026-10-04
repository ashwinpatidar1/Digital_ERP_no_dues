const express = require("express");
const {
    facultyLogin,
    studentLogin,
    directorLogin
} = require("../controllers/authController");

const router = express.Router();

router.post("/director/login", directorLogin);

router.post("/faculty/login", facultyLogin);

router.post("/student/login", studentLogin);

module.exports = router;