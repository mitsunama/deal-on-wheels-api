require('dotenv').config();

const app = require('./app.js')

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
