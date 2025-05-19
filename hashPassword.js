const bcrypt = require('bcrypt');
const password = 'admin123'; // Replace with your admin password

bcrypt.hash(password, 10).then(console.log);
