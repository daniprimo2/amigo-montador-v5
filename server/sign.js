import crypto from 'crypto';

const API_KEY = 'kxIyEPUvZNHzgy0ON2JgUJNK06mQSL'; // coloque sua chave aqui

// corpo JSON que você vai enviar (string exatamente igual ao do Insomnia)
const body = JSON.stringify({
  event: "transaction.status.changed",
  transaction: {
    id: 123456,
    status: "paid",
    amount: 1000
  }
});

const signature = 'sha1=' + crypto.createHmac('sha1', API_KEY).update(body).digest('hex');

console.log('Body:', body);
console.log('x-hub-signature:', signature);
