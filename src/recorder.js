const http = require('http');

const logger = console;
const port = process.env.SANDWORM_INSPECTOR_PORT || 7071;
let activity = [];
let server;
const sockets = new Set();

const handleRequest = (request, response) => {
  switch (request.url) {
    case '/ingest': {
      let stringBody = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => {
        stringBody += chunk;
      });
      request.on('end', () => {
        try {
          const body = JSON.parse(stringBody);

          activity = [...activity, ...body];

          response.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          response.end();
        } catch (error) {
          logger.error(error);
          response.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          response.end(`{"status":"error", "error": "${error.message}"}\n`);
        }
      });
      break;
    }
    default:
      response.writeHead(404);
      response.end();
  }
};

const recordSandwormActivity = (done, onError) => {
  if (server) {
    return;
  }

  server = http.createServer((request, response) => {
    handleRequest(request, response);
  });
  server.listen(port);
  server.on('error', (err) => {
    if (typeof onError === 'function') {
      onError(err);
    }
  });
  server.on('listening', () => {
    done();
  });
  server.on('connection', (socket) => {
    sockets.add(socket);

    server.once('close', () => {
      sockets.delete(socket);
    });
  });
};

const stopRecordingSandwormActivity = (done) => {
  if (!server) {
    return;
  }

  sockets.forEach((socket) => {
    socket.destroy();
    sockets.delete(socket);
  });
  server.close(() => {
    server = undefined;
    activity = [];
    done();
  });
};

const getRecordedActivity = () => activity;

module.exports = {
  recordSandwormActivity,
  stopRecordingSandwormActivity,
  getRecordedActivity,
};
