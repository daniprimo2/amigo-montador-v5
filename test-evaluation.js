// Test script to trigger evaluation notification for assembler
const WebSocket = require('ws');

async function testEvaluationNotification() {
  console.log('🧪 Iniciando teste de notificação de avaliação...');
  
  // Connect as assembler user ID 8 (Lucas Rodrigues Montador)
  const ws = new WebSocket('ws://localhost:3000/ws?userId=8');
  
  ws.on('open', function open() {
    console.log('✅ Conectado ao WebSocket');
    
    // Send auth message
    ws.send(JSON.stringify({
      type: 'auth',
      userId: 8,
      userType: 'montador'
    }));
    
    console.log('📤 Mensagem de autenticação enviada');
  });

  ws.on('message', function message(data) {
    const parsed = JSON.parse(data.toString());
    console.log('📩 Mensagem recebida:', parsed);
    
    if (parsed.type === 'evaluation_required') {
      console.log('🎉 SUCESSO! Notificação de avaliação recebida!');
      console.log('👤 Usuário alvo:', parsed.userId);
      console.log('⭐ Avaliar:', parsed.evaluateUser?.name);
      process.exit(0);
    }
  });

  ws.on('error', function error(err) {
    console.error('❌ Erro WebSocket:', err);
  });

  // Keep connection alive for 30 seconds
  setTimeout(() => {
    console.log('⏰ Tempo limite atingido, fechando teste');
    ws.close();
    process.exit(1);
  }, 30000);
}

testEvaluationNotification().catch(console.error);