import { ChatEvents } from './chat';
import * as lobby from './lobby/events';
import 'src/lib/lobby/events';

export type Events = lobby.LobbyEvents & ChatEvents;
