import React from 'react';
import logo from './logo.svg';
import './App.css';

class CSC {
  async request() {
    const options = {
      filters: [{
        services: ['cycling_speed_and_cadence']
      }]
    }

    this.device = await navigator.bluetooth.requestDevice(options);

    if (!this.device) {
      throw "No device selected";
    }
  }

  async connect() {
    if (!this.device) {
      await this.request();
    }
    const server = await this.device.gatt.connect();
    const service = await server.getPrimaryService("cycling_speed_and_cadence");
    this.char = await service.getCharacteristic("csc_measurement");
    this.device.addEventListener("gattserverdisconnected", () => {
      this.onDisconnected();
    });
    this.isReady = true;
    return await this.char.startNotifications();
  }

  async onDisconnected() {
    this.isReady = false;
    console.log("Device is disconnected.");
    console.debug("Reconnecting...");
    await this.reconnect();
  }

  async reconnect() {
    await this.connect();
    console.log("Reconnected.");
  }
}

function App() {
  const csc = React.useRef(() => new CSC());

  window.csc = csc.current();

  const cadence = (prev, curr) => {
    const revDelta = curr.totalCrankRevolutions - prev.totalCrankRevolutions;
    const timeDelta = curr.lastCrankTime - prev.lastCrankTime;
    const minuteRatio = 60 / timeDelta;
    return revDelta * minuteRatio;
  }
  
  const callback = (event) => {
    const data = event.target.value;
    // console.log(data);
    const flags = data.getUint8(0);
    const wheelDataPresent = flags & 0x1;
    const crankDataPresent = flags & 0x2;

    const output = {};
    if (wheelDataPresent) {
      output.totalRevolutions = data.getUint32(1, true);
      output.lastWheelTime = data.getUint16(5, true) / 1024;
    }

    if (crankDataPresent) {
      output.totalCrankRevolutions = data.getUint16(7, true);
      output.lastCrankTime = data.getUint16(9, true) / 1024;
    }

    // console.log(output)
    if (!window.lastOutput) {
      window.lastOutput = output;
    } else {
      const c = cadence(window.lastOutput, output);
      window.lastOutput = output;
      console.log('cadence' + c)
    }
    
    
    
    return output;
  }
  
  const onClick = async () => {
    const wasd = await csc.current().connect();
    wasd.addEventListener('characteristicvaluechanged', callback);
  }
  
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p onClick={onClick}>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
