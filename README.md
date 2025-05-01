# heart rate monitor

This web app estimates a user's heart rate (BPM) in real time using a regular webcam and facial detection. 

Built with React and TensorFlow.js, it uses the MediaPipe Face Mesh model to track facial landmarks and measure subtle changes in skin tone. 

By analyzing green-channel intensity through remote photoplethysmography (rPPG), it calculates BPM without any physical contact. 

A visual overlay highlights the region of the face being monitored, making the process transparent and user-friendly.

Note : To get more accurate result, please make sure to have good camera. Mobile device can give you better accuracy.