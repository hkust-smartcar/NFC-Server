# NFC-Server
Raspberry Pi server for smartcar NFC payment system

### hacky steps:
1. Open blueman -> right click TEAM_FIVE -> connect to serial -> check if it is `dev/rfcomm<n>`
2. change line 2 of `serial.js` -> `node serial.js`
3. (if said Device or resource busy) `sudo cutecom` -> connect to `dev/rfcomm<n>` -> disconnect -> redo 2.


```
sudo rfcomm bind 1 00:21:13:01:81:1C 1
node serial.js
```