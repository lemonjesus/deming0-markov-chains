const sqlite3 = require("sqlite3");
const Markov = require("markov-strings");
const express = require('express')
const app = express()
const slackdb = new sqlite3.Database("slack.sqlite", sqlite3.OPEN_READONLY);

let usersTable;

slackdb.all('SELECT id, name FROM users', (err, rows) => {
  usersTable = rows;
})

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/index.html', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/generate', (req, res) => {
  let {user, maxLength, minWords, minScore} = req.query;
  let options = {maxLength, minWords, minScore};
  if(user) {
    slackdb.all(`SELECT message AS string FROM messages JOIN users ON messages.user = users.id WHERE users.name = '${user}'`, (err, rows) => {
      if(!err) res.send(generateMarkov(rows, options));
    });
  } else {
    slackdb.all(`SELECT message AS string FROM messages`, (err, rows) => {
      if(!err) res.send(generateMarkov(rows, options));
    });
  }
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));

function generateMarkov(messages, options) {
  let markov = new Markov(messages, options);
  markov.buildCorpusSync();
  let result;
  try {
    result = markov.generateSentenceSync();
    usersTable.forEach((user) => {
      result.string = result.string.replace(`<@${user.id}>`, `@${user.name}`);
      result.refs.forEach((ref) => {
        ref.string = ref.string.replace(`<@${user.id}>`, `@${user.name}`);
      })
    });
  } catch(e) {
    result = {error: "There isn't enough data to generate a string with those settings. Try lowering some numbers."}
  }
  return result;
}