from jdm_electron_flask import JDMEvent, get_socketio

class ConnectEvent(JDMEvent):

    def on_connect(self):
        self.emit("connected", {"message": "Socket connected"})

    def on_disconnect(self):
        pass

    def on_ping_server(self, data):
        self.emit("pong_client", {"echo": data})

    def on_ping_server_2(self, data):
        self.emit("pong_client_2", {"echo": data})

    def on_start_timer(self, data):
        socketio = get_socketio()

        def timer_loop():
            counter = 1
            while True:
                socketio.emit("timer_update", {"count": counter})
                counter += 1
                socketio.sleep(1)

        socketio.start_background_task(timer_loop)

