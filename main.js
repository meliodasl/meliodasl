const Discord = require('discord.js');
const client = new Discord.Client();
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

// SQLite veritabanı bağlantısı
let db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
  
  // Linkler tablosunu oluştur
  db.run(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    user TEXT NOT NULL,
    uptime BOOLEAN DEFAULT FALSE
  )`, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Links table created or already exists.');
  });
});

client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on('message', async message => {
  if (message.content.startsWith('.ekle')) {
    const args = message.content.slice('.ekle'.length).trim().split(' ');
    const url = args[0];
    if (!url) return message.channel.send('Lütfen bir URL belirtin.');

    // Linki veritabanına ekle
    db.run(`INSERT INTO links (url, user) VALUES (?, ?)`, [url, message.author.tag], function(err) {
      if (err) {
        console.error(err.message);
        return message.channel.send('Link veritabanına eklenirken bir hata oluştu.');
      }
      message.channel.send('Link başarıyla eklendi ve uptime edilecek.');
    });
  }
});

// Her 5 dakikada bir uptime kontrolü yapılacak
setInterval(() => {
  db.all(`SELECT * FROM links WHERE uptime = FALSE`, (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }
    rows.forEach(row => {
      // HTTP isteği yaparak linkin uptime'ını kontrol et
      axios.get(row.url)
        .then(response => {
          // Link çalışıyorsa, uptime alanını TRUE olarak güncelle
          db.run(`UPDATE links SET uptime = TRUE WHERE id = ?`, [row.id], function(err) {
            if (err) {
              console.error(err.message);
            }
          });
        })
        .catch(error => {
          console.error(error);
        });
    });
  });
}, 300000); // 5 dakika

client.login('process.env.token');
