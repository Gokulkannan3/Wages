const pool = require("../config/db")
const ExcelJS = require("exceljs")

exports.markAttendance = async (req, res) => {
  const { id } = req.params
  const { imageUrl } = req.body

  const query = `
    INSERT INTO attendance (worker_id, attendance_date, status, image_url)
    VALUES ($1, CURRENT_DATE, 'Present', $2) -- Added image_url parameter
    ON CONFLICT (worker_id, attendance_date) DO UPDATE
    SET status = 'Present', image_url = $2 -- Update image_url on conflict
    RETURNING *;
  `
  try {
    const result = await pool.query(query, [id, imageUrl])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error marking attendance:", err.message)
    res.status(500).json({ error: err.message })
  }
}

exports.calculateSalary = async (req, res) => {
  const { name } = req.params
  const query = `
    SELECT w.name, w.per_day_salary, COUNT(a.attendance_date) as days_present,
           (w.per_day_salary * COUNT(a.attendance_date)) as total_salary
    FROM workers w
    JOIN attendance a ON w.id = a.worker_id
    WHERE w.name = $1 AND a.attendance_date >= CURRENT_DATE - INTERVAL '1 month'
    GROUP BY w.name, w.per_day_salary;
  `
  try {
    const result = await pool.query(query, [name])
    res.json(result.rows[0] || { total_salary: 0 })
  } catch (err) {
    console.error("Error calculating salary:", err.message)
    res.status(500).json({ error: err.message })
  }
}

exports.downloadExcel = async (req, res) => {
  const { month, year } = req.query
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const endDate   = new Date(year, month, 0).toISOString().slice(0, 10)

  const query = `
    SELECT
      w.id,
      w.name,
      w.phone,
      w.village,
      w.per_day_salary,
      COUNT(a.attendance_date) AS days_present,
      (w.per_day_salary * COUNT(a.attendance_date)) AS total_salary
    FROM workers w
    LEFT JOIN attendance a
      ON w.id = a.worker_id
     AND a.attendance_date >= $1
     AND a.attendance_date <= $2
    GROUP BY w.id, w.name, w.phone, w.village, w.per_day_salary
    ORDER BY w.name;
  `

  try {
    const result = await pool.query(query, [startDate, endDate])
    const data = result.rows

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Attendance Report")
    worksheet.columns = [
      { header: "ID",            key: "id",             width: 8 },
      { header: "Name",          key: "name",           width: 20 },
      { header: "Phone",         key: "phone",          width: 15 },
      { header: "Village",       key: "village",        width: 15 },
      { header: "Salary/Day",    key: "per_day_salary", width: 14 },
      { header: "Days Present",  key: "days_present",   width: 14 },
      { header: "Total Salary",  key: "total_salary",   width: 16 },
    ]
    data.forEach(row => {
      worksheet.addRow({
        id: row.id,
        name: row.name,
        phone: row.phone,
        village: row.village,
        per_day_salary: row.per_day_salary,
        days_present: row.days_present,
        total_salary: row.total_salary,
      })
    })
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A73E8" },
    }
    headerRow.alignment = { vertical: "middle", horizontal: "center" }
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_report_${month}-${year}.xlsx`
    )

    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    console.error("Error generating Excel:", err.message)
    res.status(500).json({ error: err.message })
  }
}