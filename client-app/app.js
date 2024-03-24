const express = require("express");
const mysql = require("mysql2");
const amqp = require('amqplib');
const bodyParser = require('body-parser'); //express could not handle it so I used body-parser.
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
const rabbitmqHost = 'rabbitmq';
const rabbitmqUrl = "amqp://rabbitmq:5672";

const port = 4002;

app.use(express.json());

const pool = mysql.createPool({
    connectionLimit: 100,
    host: "mysql-service",
    user: "root",
    password: "12345678",
    database: "devopsakademi",
  });

  app.get("/", (req, res) => {
    res.send("Hi this is Client app!!");
});


pool.getConnection((err, connection) => {
    if (err) {
      console.log("Database connection error: ", err);
    } else {
      console.log("Database connected");
    }
});

async function start() {
    try {
        await connectToRabbitMQ();
        app.listen(port, () => {
            console.log(`Client-app listening at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error starting Client App:', error);
        // Exit the process or handle the error accordingly
        process.exit(1);
    }
}

async function connectToRabbitMQ() {
    try {
        const connection = await amqp.connect(rabbitmqUrl,'heartbeat=60');
        const channel = await connection.createChannel();
        await channel.assertQueue('k8s_queue', { durable: true });
        console.log('Connected to RabbitMQ');

        // Start consuming messages from the queue
        channel.consume('k8s_queue', (message) => {
            const data = JSON.parse(message.content.toString());
            console.log(data);
            handleMessage(data);
            channel.ack(message); // Acknowledge message receipt
        });
    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        throw error;
    }
}

async function handleMessage(data) {
    console.log('Received message from RabbitMQ:', data);
    const { method, path, data: requestBody } = data;

    try {
        const client = await pool.getConnection();
        
        if (method === "POST") {
            const { text } = requestBody;
            const insertQuery = `INSERT INTO texts (text) VALUES (?)`; // Use "?" as placeholder
            const [rows, fields] = await client.query(insertQuery, [text]);
            console.log("Data inserted successfully:", rows);
        } else if (method === "PUT") {
            const { id, text } = requestBody;
            const updateQuery = `UPDATE texts SET text = ? WHERE id = ?`; // Use "?" as placeholder
            const [rows, fields] = await client.query(updateQuery, [text, id]);
            console.log("Data updated successfully:", rows);
        } else if (method === "DELETE") {
            const id = parseInt(data.data);
            const deleteQuery = `DELETE FROM texts WHERE id = ?`; // Use "?" as placeholder
            const [rows, fields] = await client.query(deleteQuery, [id]);
            console.log("Data deleted successfully:", rows);
        } else {
            console.log("Unsupported method:", method);
        }
        
        client.release();
    } catch (error) {
        console.error('Error handling message:', error);
    }
}



start();
