const express = require("express")
const cors = require("cors")
require("dotenv").config()
const apiRoutes = require("./Router/api") // Corrected path

const app = express()
const port = process.env.PORT || 3000

app.use(cors({
  origin: '*'
}));
app.use(express.json({ limit: "50mb" })) // Increased limit for image data
app.use(express.urlencoded({ limit: "50mb", extended: true })) // For URL-encoded bodies

app.use("/api", apiRoutes)

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
