const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345',
  database: 'umny_kan_db',
});

client.connect()
  .then(() => {
    console.log('✅ ПОДКЛЮЧЕНИЕ УСПЕШНО!');
    return client.query('SELECT NOW() as time');
  })
  .then(res => {
    console.log('Текущее время в БД:', res.rows[0].time);
    client.end();
  })
  .catch(err => {
    console.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ:', err.message);
    client.end();
  });