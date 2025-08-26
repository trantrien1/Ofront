declare module "@stomp/stompjs" {
  export interface IMessage { body: string; headers?: Record<string, string>; }
  export class Client {
    constructor(config?: any);
    onConnect?: (frame?: any) => void;
    onStompError?: (frame: any) => void;
    subscribe(destination: string, callback: (message: IMessage) => void): any;
    activate(): void;
    deactivate(): void;
    readonly connectedVersion?: string;
  }
}

declare module "sockjs-client" {
  const SockJS: any;
  export default SockJS;
}
