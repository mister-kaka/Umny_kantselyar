import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
        credentials: true,
    },
    namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    handleConnection(client: Socket) {
        const userId = client.handshake.query.userId;
        if (userId) {
            client.join(`user_${userId}`);
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.handshake.query.userId;
        if (userId) {
            client.leave(`user_${userId}`);
        }
    }

    sendUnreadCountUpdate(userId: number) {
        this.server.to(`user_${userId}`).emit('unreadCountChanged');
    }
}