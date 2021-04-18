import http.server
import socketserver

port = 8025

server = http.server.SimpleHTTPRequestHandler
request = socketserver.TCPServer(("",port),server)
print("server is up ....",port)
request.serve_forever()