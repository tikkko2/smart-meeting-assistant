import { Server as HTTPServer } from 'http';
import { Socket as NetSocket } from 'net';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as IOServer } from 'socket.io';
import { realTimeTranscriber } from './realtime-transcriber';

interface SocketServer extends HTTPServer {
  io?: IOServer | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new IOServer(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('start-transcription', (data) => {
        const { sessionId } = data;
        console.log('Starting transcription session:', sessionId);
        socket.join(sessionId);
        socket.emit('session-started', { sessionId });
      });

      socket.on('audio-chunk', async (data) => {
        const { audioData, sessionId, timestamp } = data;
        
        try {
          const result = await realTimeTranscriber.processAudioChunk({
            data: new Uint8Array(audioData).buffer,
            timestamp,
            sessionId
          });

          if (result) {
            // Broadcast transcription to all clients in the session
            io.to(sessionId).emit('transcription-result', result);
          }
        } catch (error) {
          console.error('Error processing audio chunk:', error);
          socket.emit('transcription-error', { 
            error: 'Failed to process audio chunk',
            sessionId 
          });
        }
      });

      socket.on('end-transcription', (data) => {
        const { sessionId } = data;
        console.log('Ending transcription session:', sessionId);
        realTimeTranscriber.cleanupSession(sessionId);
        socket.leave(sessionId);
        socket.emit('session-ended', { sessionId });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
  res.end();
};

export default SocketHandler;
