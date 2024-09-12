const pool = require('../db/pool');
const ExcelJS = require('exceljs');

// Read the Excel file
const workbook = new ExcelJS.Workbook();
workbook.xlsx
  .readFile('public/students_data.xlsx')
  .then(() => {
    const worksheet = workbook.getWorksheet(1); // Assuming data is in the first sheet
    const studentsData = [];

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

    return studentsData;
  })
  .then(async (studentsData) => {
    try {
      for (let student of studentsData) {
        // Destructure student object to get the properties
        const {
          id,
          student_name,
          index_number,
          status,
          voted,
          profile_photo,
          phone_number,
        } = student;

        // Write your SQL query for updating the database
        const query = `
        INSERT INTO students (id, student_name, index_number, status, voted, profile_photo, phone_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
            student_name = EXCLUDED.student_name,
            index_number = EXCLUDED.index_number,
            status = EXCLUDED.status,
            voted = EXCLUDED.voted,
            profile_photo = EXCLUDED.profile_photo,
            phone_number =EXCLUDED.phone_number;
    `;

        await pool.query(query, [
          id,
          student_name,
          index_number,
          status,
          voted,
          profile_photo,
          phone_number,
        ]);
      }

      console.log('Database update complete!');
    } catch (err) {
      console.error('Error updating database:', err);
    } finally {
      console.log('updated');
    }
  })
  .catch((err) => {
    console.error('Error reading Excel file:', err);
  });
