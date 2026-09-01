require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log('Ferremat backend escuchando en http://localhost:' + PORT);
  console.log('Panel admin disponible en http://localhost:' + PORT + '/admin');
});
