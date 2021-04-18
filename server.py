# pip install websocket-server

from websocket_server import WebsocketServer
import numpy as np
import time
import json
import cv2

video_path =r'.\\video\\test.mp4'   # fps = 30

def new_client(client, server):
    print("client(%s) connected" % client['id'])
    # server.send_message_to_all("Hello, I'm server!")
    # server.send_message_to_all("Hello, I'm server!")
    # send(server)
    videoToImage(video_path)
    send(server)

def client_left(client, server):
    print("client(%s) disconnected" % client['id'])
    
def send(server):
    for i in range(10):
        server.send_message_to_all(str(i))
        time.sleep(1)

def videoToImage(videopath):
    send_data = {}
    vidcap = cv2.VideoCapture(videopath)
    print('videoFPS:', vidcap.get(cv2.CAP_PROP_FPS))
    success,image = vidcap.read()
    # count = 0
    success = True
    # image.shape (2048, 3840, 3)
    while success:
        success,image = vidcap.read()
        imageArray = np.array(image).flatten()
        imageList = imageArray.tolist()
        # print(type(imageList))
        # print(len(imageList))
        imageSlice = [imageList[i:i+3] for i in range(0, len(imageList), 3)]
        imageData = []
        for imageItem in imageSlice:
            imageItem.insert(3,1)
            imageData.append(imageItem)
        imageDataToArray= np.array(imageData).flatten()
        imageSource = imageDataToArray.tolist()
        send_data["Image_data"] = imageSource
        # print(send_data)
        # print("**************")
        server.send_message_to_all(json.dumps(send_data))
        time.sleep(33)
        # img_save_path = f".\\frame\\testFrame\\" + "frame%d.jpg" % count
        # cv2.imwrite(img_save_path, image)     # save frame as JPEG file
        # if cv2.waitKey(10) == 27:                     
        #     break
        # count += 1

if __name__ == "__main__":


    # create the websocket server
    server = WebsocketServer(8180, "0.0.0.0")
    server.set_fn_new_client(new_client)
    server.set_fn_client_left(client_left)
    server.run_forever()

    
    # """videoToImage"""

    
    # videoToImage(video_path)

    # img = cv2.imread(r'.\frame\testFrame\frame1.jpg')
    # sp = img.shape
    # print(sp)  # testsize (368, 640, 3)