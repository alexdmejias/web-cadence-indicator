import React from 'react';
import logo from './logo.svg';
import './App.css';

const FITNESS_SERVICE = 'fitness_machine';
const FITNESS_CHARACTERISTIC = 'indoor_bike_data';

const CYCLING_SERVICE = 'cycling_speed_and_cadence';
const CYCLING_CHARACTERISTIC = 'csc_measurement';

const useFitness = true;
let SERVICE;
let CHARACTERISTIC;
if (useFitness) {
  SERVICE = FITNESS_SERVICE;
  CHARACTERISTIC = FITNESS_CHARACTERISTIC;
} else {
  SERVICE = CYCLING_SERVICE;
  CHARACTERISTIC = CYCLING_CHARACTERISTIC
}

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
  const [cadence, setCadence] = React.useState(0);
  const [speed, setSpeed] = React.useState(0);
  window.csc = csc.current();

  const cadence1 = (prev, curr) => {
    const revDelta = curr.totalCrankRevolutions - prev.totalCrankRevolutions;
    const timeDelta = curr.lastCrankTime - prev.lastCrankTime;
    const minuteRatio = 60 / timeDelta;
    return revDelta * minuteRatio;
  }
  
  const cyclingCallback = (event) => {
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
  
  const fitnessCallback = (event) => {
    const data = event.target.value;
    // console.log(data);
    const flags = data.getUint16(0, true);
    // var ble_bytes = new Uint8Array([0x44, 0x02, 0x52, 0x03, 0x5A, 0x00, 0x08, 0x00, 0x00]).buffer;
    // var view = new DataView(ble_bytes)
    
    // flags = view.getUint16(0, true);
    // var i;
    // for (i = 0; i < 16; i++) {
    //   console.log('flags[' + i + '] = ' + (!!(flags >>> i & 1)));
    // }
    // console.log('Instantaneous Speed = ' + view.getUint16(2, true) / 100)
    // console.log('Instantaneous Cadence = ' + view.getUint16(4, true) * 0.5)
    // console.log('Instantaneous Power  = ' + view.getInt16(6, true))
    // console.log('Heart Rate  = ' + view.getUint8(8, true))
    const parsedCadence = data.getUint16(4, true) * 0.5;
    const parsedSpeed = data.getUint16(2, true) / 100;
    setCadence(parsedCadence);
    setSpeed(parsedSpeed);

    // console.log('cadenceDataPresent', cadenceDataPresent)
    // console.log('crankDataPresent', crankDataPresent)
    // console.log('speed', data.getUint16(2, true) / 100, 'kilometers')
    // const wasd = data.getUint16(6, true) * .5;
    // setV(wasd)
    // window.wasd = wasd;
    // console.log('cadence', wasd)
  }
  
  const onClick = async () => {
    const wasd = await csc.current().connect();
    if (useFitness) {
      wasd.addEventListener('characteristicvaluechanged', fitnessCallback);
    } else {
      wasd.addEventListener('characteristicvaluechanged', cyclingCallback);
    }
  }
  
  return (
    <div className="App">
      <header className="App-header">
        <button onClick={onClick}>Start</button>
        <h1>speed {speed}</h1>
        <h1>cadence {cadence}</h1>
      </header>
    </div>
  );
}

export default App;
