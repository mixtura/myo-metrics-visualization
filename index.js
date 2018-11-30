const Influx = require('influx');
const express = require('express');
const path = require('path');
const os = require('os');
const bodyParser = require('body-parser');
const app = express();
const influx = new Influx.InfluxDB('http://localhost/TestDb');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('port', 3000);

influx.getMeasurements()
  .then(names => console.log('My measurement names are: ' + names.join(', ')))
  .then(() => {
    app.listen(app.get('port'), () => {
      console.log(`Listening on ${app.get('port')}.`);
    });
  })
  .catch(error => console.log({ error }));

app.get('/api/logs', (request, response) => {
  influx.query(`select * from ${request.query.measurement} where ProcessId='${request.query.processId}'`)
    .then(result => response.status(200).json(result))
    .catch(error => response.status(500).json({ error }));
});

app.get('/api/processids', (request, response) => {
  influx.query(`show tag values from ${request.query.measurement} with key=ProcessId`)
    .then(result => result.map(x => x.value))
    .then(result => response.status(200).json(result))
    .catch(error => response.status(500).json({ error }));
});

app.get('/api/measurements', (request, response) => {
    influx.getMeasurements()
      .then(result => response.status(200).json(result))
      .catch(error => response.status(500).json({ error }));
});
