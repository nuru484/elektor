const pool = require('../db/pool');
const ExcelJS = require('exceljs');

async function updateDatabaseFromExcel() {
  const workbook = new ExcelJS.Workbook();
  try {
    // Read the Excel file
    await workbook.xlsx.readFile('public/students_data.xlsx');
    const worksheet = workbook.getWorksheet(1); // Assuming data is in the first sheet
    const studentsData = [];

    // Parse the worksheet data
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const student = {
        id: row.getCell(1).value,
        student_name: row.getCell(2).value,
        index_number: row.getCell(3).value,
        status: row.getCell(4).value,
        voted: row.getCell(5).value,
        profile_photo: row.getCell(6).value,
        phone_number: row.getCell(7).value,
      };

      studentsData.push(student);
    });

    // Define the query for updating the database
    const query = `
      INSERT INTO students (id, student_name, index_number, status, voted, profile_photo, phone_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
          student_name = EXCLUDED.student_name,
          index_number = EXCLUDED.index_number,
          status = EXCLUDED.status,
          voted = EXCLUDED.voted,
          profile_photo = EXCLUDED.profile_photo,
          phone_number = EXCLUDED.phone_number;
    `;

    const client = await pool.connect();
    try {
      await client.query('BEGIN'); // Start transaction

      for (let student of studentsData) {
        await client.query(query, [
          student.id,
          student.student_name,
          student.index_number,
          student.status,
          student.voted,
          student.profile_photo,
          student.phone_number,
        ]);
      }

      await client.query('COMMIT'); // Commit transaction
    } catch (dbError) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      console.error('Database error:', dbError.message);
    } finally {
      client.release(); // Release client back to the pool
    }
  } catch (fileError) {
    console.error('Error reading Excel file:', fileError.message);
  }
}

updateDatabaseFromExcel();
