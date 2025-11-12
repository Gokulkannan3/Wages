const express = require("express")
const router = express.Router()
const attendanceController = require("../Controller/attendanceController")
const workerController = require("../Controller/workerController")
const imageUploadController = require("../Controller/imageUploadController")

// Worker routes
router.post("/workers", workerController.addWorker)
router.get("/workers", workerController.getWorkers)
router.post("/identify-worker", workerController.identifyWorker)
router.put("/workers/:id", workerController.updateWorker);
router.delete("/workers/:id", workerController.deleteWorker);

// Attendance routes
router.post("/attendance/:id", attendanceController.markAttendance) // Mark attendance by worker ID
router.get("/salary/:name", attendanceController.calculateSalary)
router.get("/download-excel", attendanceController.downloadExcel)

// Image upload route
router.post("/upload-image", imageUploadController.uploadImage)

module.exports = router