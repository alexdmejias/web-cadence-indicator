import React from 'react';
import logo from './logo.svg';
import './App.css';

// const SERVICE = 'fitness_machine';
const SERVICE = 'cycling_speed_and_cadence';
// const CHARACTERISTIC = 'indoor_bike_data';
const CHARACTERISTIC = 'csc_measurement';

class CSC { 
  async request() {
    const options = {
      filters: [{
        services: [SERVICE]
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
    const service = await server.getPrimaryService(SERVICE);
    this.char = await service.getCharacteristic(CHARACTERISTIC);
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
  const [v, setV] = React.useState('empty');
  window.csc = csc.current();

  const cadence1 = (prev, curr) => {
    const revDelta = curr.totalCrankRevolutions - prev.totalCrankRevolutions;
    const timeDelta = curr.lastCrankTime - prev.lastCrankTime;
    const minuteRatio = 60 / timeDelta;
    return revDelta * minuteRatio;
  }
  
  const callback1 = (event) => {
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
      const c = cadence1(window.lastOutput, output);
      setV(c)
      window.lastOutput = output;
      console.log('cadence' + c)
    }
    
    return output;
  }

  const cadence2 = (prev, curr) => {
    const revDelta = curr.totalCrankRevolutions - prev.totalCrankRevolutions;
    const timeDelta = curr.lastCrankTime - prev.lastCrankTime;
    const minuteRatio = 60 / timeDelta;
    return revDelta * minuteRatio;
  }
  
  const callback2 = (event) => {
    const data = event.target.value;
    // console.log(data);
    const flags = data.getUint8(0);
    const cadenceDataPresent = flags & 0x1;
    const crankDataPresent = flags & 0x2;


    // console.log('cadenceDataPresent', cadenceDataPresent)
    // console.log('crankDataPresent', crankDataPresent)
    // console.log('speed', data.getUint16(2, true) / 100, 'kilometers')
    const wasd = data.getUint16(6, true) * .5;
    setV(wasd)
    window.wasd = wasd;
    console.log('cadence', wasd)
  }
  
  const onClick = async () => {
    const wasd = await csc.current().connect();
    wasd.addEventListener('characteristicvaluechanged', callback1);
    // wasd.addEventListener('characteristicvaluechanged', callback2);
  }
  
  return (
    <div className="App">
      <header className="App-header">
        <button onClick={onClick}>Start</button>
        <h1>{v}</h1>
      </header>
    </div>
  );
}

export default App;
