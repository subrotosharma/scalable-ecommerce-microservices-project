const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-west-2' });
const sns = new AWS.SNS({ region: process.env.AWS_REGION || 'us-west-2' });

app.post('/api/notifications/email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    
    const params = {
      Source: process.env.FROM_EMAIL || 'noreply@example.com',
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } }
      }
    };
    
    const result = await ses.sendEmail(params).promise();
    res.json({ messageId: result.MessageId, status: 'sent' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/notifications/sms', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    const params = {
      PhoneNumber: phone,
      Message: message
    };
    
    const result = await sns.publish(params).promise();
    res.json({ messageId: result.MessageId, status: 'sent' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/notifications/order-confirmation', async (req, res) => {
  try {
    const { email, orderId, items } = req.body;
    
    const subject = `Order Confirmation - ${orderId}`;
    const body = `Your order ${orderId} has been confirmed. Items: ${items.map(i => i.name).join(', ')}`;
    
    const params = {
      Source: process.env.FROM_EMAIL || 'orders@example.com',
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } }
      }
    };
    
    const result = await ses.sendEmail(params).promise();
    res.json({ messageId: result.MessageId, status: 'sent' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-service' });
});

app.listen(port, () => {
  console.log(`Notification service running on port ${port}`);
});