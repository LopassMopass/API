const mysql = require('mysql2');

class DatabaseSingleton {
  constructor() {
    if (!DatabaseSingleton.instance) {
      this.connection = mysql.createConnection({
        host: 'localhost:3306',
        user: 'user',
        password: 'dUh!8b-Cl@ti9',
        database: 'BlogDatabase'
      });

      this.connection.connect((err) => {
        if (err) {
          console.error('Error connecting to the MySQL database:', err);
        } else {
          console.log('Connected to MySQL database.');
        }
      });

      DatabaseSingleton.instance = this;
    }

    return DatabaseSingleton.instance;
  }

  // Create a method to fetch data
  query(sql, params) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, params, (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    });
  }
}

// Export the singleton instance
const instance = new DatabaseSingleton();
Object.freeze(instance); // Ensure the singleton is immutable
module.exports = instance;
