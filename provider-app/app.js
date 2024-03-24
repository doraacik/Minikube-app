const express = require('express');
const amqp = require('amqplib');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const rabbitmqHost = 'rabbitmq';
const rabbitmqUrl = "amqp://rabbitmq:5672";
const port = 4001;

app.use(bodyParser.urlencoded({ extended: false }));

async function start() {
    try {
      await connectToRabbitMQ();
      app.listen(port, () => {
        console.log(`Provider-app listening at http://localhost:${port}`);
      });
    } catch (error) {
      console.error('Error starting Provider App:', error);
    }
  }

  async function connectToRabbitMQ() {
    try {
      const connection = await amqp.connect(`amqp://${rabbitmqHost}`);
      const channel = await connection.createChannel();
      await channel.assertQueue('k8s_queue', { durable: true });
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Error connecting to RabbitMQ:', error);
      throw error;
    }
  }

  app.get("/", (req, res) => {
    res.send("Hi this is Provider app!!");
});

  app.get('/texts/post/:txt', async (req, res) => {
    try {
      const text = req.params.txt;
      const jsonData = {
        txt: text,
        method: "POST"
      };
      await triggerRabbitMQ('POST', `/texts/post/${text}`, jsonData);   
      res.redirect('/'); 
    } catch (error) {
      console.error('Error:', error.message);
      res.status(500).send('Internal Server Error');
    }
  });

  async function triggerRabbitMQ(method, path,data) {
    try {
      const connection = await amqp.connect(rabbitmqUrl, 'heartbeat=60');
      const channel = await connection.createChannel();
  
      const requestData = { method, path, data };
      const message = JSON.stringify(requestData);
      await channel.sendToQueue('k8s_queue', Buffer.from(message));
      console.log('Message sent to RabbitMQ:', message);
  
      await channel.close();
      await connection.close();
  
    } catch (error) {
      console.error('Error sending message to RabbitMQ:', error);
      throw error;
    }
  }

  start();