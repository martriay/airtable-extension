// Hot reload for Chrome extension development
const WEBSOCKET_PORT = 8080;

let websocket;
let reconnectInterval;

function connect() {
  websocket = new WebSocket(`ws://localhost:${WEBSOCKET_PORT}`);
  
  websocket.onopen = () => {
    console.log('🔥 Hot reload connected');
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  };
  
  websocket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'reload') {
      console.log('🔄 Reloading extension...');
      chrome.runtime.reload();
    }
  };
  
  websocket.onclose = () => {
    console.log('❌ Hot reload disconnected, attempting to reconnect...');
    if (!reconnectInterval) {
      reconnectInterval = setInterval(connect, 1000);
    }
  };
  
  websocket.onerror = () => {
    websocket.close();
  };
}

// Only connect in development
if (process.env.NODE_ENV === 'development') {
  connect();
} 